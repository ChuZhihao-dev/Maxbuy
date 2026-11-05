"""Assert native Category facets and the complete configured Brand directory on /all.
Usage: python3 tests/maxbuy-catalog-directory.py /path/to/rendered-page.html
No network, dependencies or test products required.
"""
import sys
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path

class Node:
    def __init__(self, tag='', attrs=(), parent=None):
        self.tag, self.attrs, self.parent = tag, dict(attrs), parent
        self.children = []
    def text(self):
        return ' '.join(''.join(x.text() if isinstance(x, Node) else x for x in self.children).split())
    def walk(self):
        yield self
        for child in self.children:
            if isinstance(child, Node):
                yield from child.walk()
    def has_class(self, name):
        return name in self.attrs.get('class', '').split()

class Tree(HTMLParser):
    VOID = {'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'}
    def __init__(self, html):
        super().__init__(convert_charrefs=True)
        self.root = self.current = Node()
        self.feed(html)
    def handle_starttag(self, tag, attrs):
        n = Node(tag, attrs, self.current)
        self.current.children.append(n)
        if tag not in self.VOID:
            self.current = n
    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in self.VOID:
            self.handle_endtag(tag)
    def handle_endtag(self, tag):
        node = self.current
        while node.parent:
            if node.tag == tag:
                self.current = node.parent
                return
            node = node.parent
    def handle_data(self, value):
        self.current.children.append(value)

def check(path):
    root = Tree(Path(path).read_text()).root
    all_nodes = list(root.walk())
    main = next(n for n in all_nodes if n.tag == 'maxbuy-collection')
    assert main.attrs['data-catalog-mode'] == 'true', 'Expected catalog mode'
    expected_brands = {n.text() for n in all_nodes if n.has_class('maxbuy-brand-menu__name')}
    assert expected_brands, 'Expected configured brand menu in page header'
    groups = {n.attrs.get('data-filter-key'): n for n in main.walk() if 'data-filter-key' in n.attrs}
    category = groups[next(k for k in groups if k and ('product_type' in k or 'catalog_categories' in k))]
    brand = groups[next(k for k in groups if k and ('vendor' in k or 'custom.brand' in k))]
    brand_labels = [n.text() for n in brand.walk() if n.has_class('maxbuy-collection__value-label')]
    category_labels = [n.text() for n in category.walk() if n.has_class('maxbuy-collection__value-label') or 'data-directory-group' in n.attrs]
    # Native count suffixes are intentionally excluded from directory label matching.
    def clean(value):
        value = value.strip()
        if value.endswith(')') and ' (' in value:
            prefix, suffix = value.rsplit(' (', 1)
            if suffix[:-1].isdigit(): return prefix
        return value
    brand_labels = [clean(x) for x in brand_labels]
    category_labels = [clean(x) for x in category_labels]
    assert not {'home appliances', 'home appliance'} & {x.casefold() for x in category_labels}, 'Parent category should be flattened'
    assert {x.casefold() for x in expected_brands} <= {x.casefold() for x in brand_labels}, f'Missing brands: {expected_brands - set(brand_labels)}'
    assert all(v == 1 for v in Counter(x.casefold() for x in category_labels).values()), 'Duplicate category labels'
    category_nodes = list(category.walk())
    assert not any('data-directory-handle' in n.attrs or 'data-directory-group' in n.attrs or 'data-directory-unmapped' in n.attrs for n in category_nodes), 'Category must not duplicate Collection menu rows'
    category_inputs = [n for n in category_nodes if n.tag == 'input' and n.attrs.get('type') == 'checkbox']
    assert category_inputs, 'Expected real Category filters'
    assert all(n.attrs.get('name') == category.attrs['data-filter-key'] and n.attrs.get('value') for n in category_inputs), 'Category must use native filter parameters'
    assert len({n.attrs['value'] for n in category_inputs}) == len(category_inputs), 'Duplicate category values'
    assert all(v == 1 for v in Counter(x.casefold() for x in brand_labels).values()), 'Duplicate brand options'
    for group in (category, brand):
        for n in group.walk():
            if 'data-directory-unmapped' in n.attrs:
                inputs = [c for c in n.walk() if c.tag == 'input']
                assert inputs and all('disabled' in c.attrs and not c.attrs.get('name') for c in inputs), 'Unmapped directory value can submit'
                assert not any(c.has_class('maxbuy-collection__value-count') for c in n.walk()), 'Unknown count was fabricated'
    ids = [n.attrs['id'] for group in (category, brand) for n in group.walk() if 'id' in n.attrs]
    assert len(ids) == len(set(ids)), 'Duplicate facet DOM ids'
    assert len([n for n in all_nodes if n.tag == 'h1']) == 1, 'Expected one H1'
    print(f'PASS {path}: {len(category_inputs)} unique native category values and {len(expected_brands)} menu brands present; no duplicate menu categories/facet ids or fabricated unmapped counts')

for path in sys.argv[1:]:
    check(path)

"""Validate the real product summary from saved Shopify HTML and product JSON.
Usage: python3 tests/maxbuy-pdp-summary.py page.html product.json [selected-variant-id]
"""
import importlib.util
import json
import sys
from pathlib import Path

spec = importlib.util.spec_from_file_location('directory_tree', Path(__file__).with_name('maxbuy-catalog-directory.py'))
module = importlib.util.module_from_spec(spec)
# That helper has a CLI; avoid running it on the PDP arguments while importing its parser.
args = sys.argv[:]
sys.argv = [args[0]]
spec.loader.exec_module(module)
sys.argv = args
Tree = module.Tree

root = Tree(Path(args[1]).read_text()).root
product = json.loads(Path(args[2]).read_text())
section = next(n for n in root.walk() if n.has_class('section-main-product'))
nodes = list(section.walk())
variant = next(v for v in product['variants'] if str(v['id']) == args[3]) if len(args) > 3 else next(v for v in product['variants'] if v['available'])
assert len([n for n in nodes if n.tag == 'h1']) == 1
badges = next(n for n in nodes if n.has_class('maxbuy-product-badges'))
badge_texts = [n.text() for n in badges.walk() if n.has_class('maxbuy-product-badges__text')]
assert 'New Arrival' in badge_texts
percent = round((variant['compare_at_price'] - variant['price']) * 100 / variant['compare_at_price'])
assert f'-{percent}%' in badge_texts
saving = next(n.text() for n in nodes if n.has_class('maxbuy-product-mobile__saving'))
amount = f"{(variant['compare_at_price'] - variant['price']) / 100:,.2f}"
assert amount in saving, (saving, amount)
accessory_link = next(n for n in nodes if n.has_class('product-accessories__more'))
assert accessory_link.attrs['href'] == '/collections/accessories'
assert len([n for n in nodes if n.has_class('product-accessories__card')]) == 2
color = next(n for n in nodes if 'data-product-color-option' in n.attrs)
assert 'Select color:' in color.text()
color_labels = [n for n in color.walk() if n.has_class('swatch-option__label')]
expected = product['options'][0]['values']
assert [n.text() for n in color_labels] == expected
radios = [n for n in color.walk() if n.tag == 'input' and n.attrs.get('type') == 'radio']
assert len(radios) == len(expected)
assert len({n.attrs['id'] for n in radios}) == len(radios)
checked = [n.attrs.get('value') for n in radios if 'checked' in n.attrs]
assert checked == [variant['option1']], (checked, variant['option1'])
for image in (n for n in badges.walk() if n.tag == 'img'):
    assert image.attrs['width'] == '4' and image.attrs['height'] == '4'
    assert 'figma.com' not in image.attrs['src']
print(f'PASS: New Arrival, -{percent}%, {saving}, {len(color_labels)} native color labels with {checked[0]} selected, accessory link, one H1')

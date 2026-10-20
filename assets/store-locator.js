if (!window.Maximize.loadedScript.includes("store-locator.js")) {
  window.Maximize.loadedScript.push("store-locator.js");

  requestAnimationFrame(() => {
    const defineXStoreLocator = () => {
      Alpine.data('xStoreLocator', (sectionId, activeBlockId, autoSelectFirstStore) => ({
        show: false,
        active: activeBlockId,
        currentSelected: false,
        selectedStore: "",
        selectionChanged: false,
        init() {
          this.syncSelection();
          const saved = window.MaxbuyStoreLocator.getSelection();
          const currentSelectedStore = this.currentSelected || (!saved.selectedStore && autoSelectFirstStore ? activeBlockId : false);
          const currentCheckbox = document.getElementById(`Checkbox__${sectionId}-${currentSelectedStore}`);
          if (currentCheckbox) {
            this.currentSelected = currentSelectedStore;
            this.selectedStore = currentCheckbox.dataset.storeName;
            window.MaxbuyStoreLocator.selectStore(this.currentSelected, sectionId);
          }

          this.onStoreChanged = (event) => {
            this.syncSelection(event.detail.selection);
          };
          document.addEventListener('maximize:store-changed', this.onStoreChanged);

          // Set fix height content on tablet and desktop 
          const storeLocatorContentEl = this.$el.querySelector('.store-locator__content');
          const tabletMediaQuery = window.matchMedia(`(min-width: ${MIN_DEVICE_WIDTH.tablet}px)`);

          const handleMediaChange = (e) => {

            if (!storeLocatorContentEl || !this.show) return;
            if (e.matches) {
              // Width is >= tablet
              storeLocatorContentEl.style.height = `${storeLocatorContentEl.getBoundingClientRect().height}px`
            } else {
              // Width is < tablet
              storeLocatorContentEl.style.height = '';
            }
          };
          
          if (storeLocatorContentEl) {
            tabletMediaQuery.addEventListener('change', handleMediaChange);
          }

          // Event click map icon to open popup
          document.addEventListener(`${STORE_MAP_EVENT.openPopup}`, (e) => {
            this.openStoreLocatorPopup();
            setTimeout(() => {
              handleMediaChange(tabletMediaQuery)
            }, 300)
          });

          // Check section selected
          if (Shopify.designMode) {
            document.addEventListener('shopify:section:select', (event) => {
              if (event.target.classList.contains('section-store-locator')) {
                this.openStoreLocatorPopup();
              }
            })
          }
        },
        destroy() {
          document.removeEventListener('maximize:store-changed', this.onStoreChanged);
        },
        syncSelection(selection = window.MaxbuyStoreLocator.getSelection()) {
          const store = window.MaxbuyStoreLocator.findSelectedStore(window.MaxbuyStoreLocator.getStores(sectionId), selection, sectionId);
          this.currentSelected = store?.id || false;
          this.selectedStore = store?.name || '';
          this.selectionChanged = false;
        },
        openStoreLocatorPopup() {
          this.syncSelection();
          this.show = true;
          Alpine.store("xMaximizePopup").handleOpen();
          Alpine.store("xMaximizeDrawer").activeDrawerElement = window.Maximize.isShowPopupOverlay;
        },
        closeStoreLocatorPopup() {
          if (this.currentSelected === false && this.selectionChanged) {
            window.MaxbuyStoreLocator.clearSelection();
          }
          this.selectionChanged = false;
          this.show = false;
          Alpine.store("xMaximizePopup").handleClose();
        },
        toggleSelected(el, currentSelected) {
          this.selectionChanged = true;
          this.currentSelected = this.currentSelected == currentSelected ? false : currentSelected;
          this.selectedStore = this.currentSelected ? el.dataset.storeName : "";
        },
        setSelectedStore() {
          if (this.currentSelected) {
            if (window.MaxbuyStoreLocator.selectStore(this.currentSelected, sectionId)) this.closeStoreLocatorPopup();
          }
        },
        isItemPartiallyVisible(el) {
          const itemEl = el.closest('.store-locator__content__item') || el;
          const listItemsEl = window.innerWidth >= MIN_DEVICE_WIDTH.tablet ? el.closest('.store-locator__content') : el.closest('.store-locator__wrapper');
          if (!itemEl || !listItemsEl) return;
  
          const itemRect = itemEl.getBoundingClientRect();
          const listItemsRect = listItemsEl.getBoundingClientRect();
  
          const verticallyVisible = itemRect.bottom > listItemsRect.top && itemRect.top < listItemsRect.bottom;
          const horizontallyVisible = itemRect.right > listItemsRect.left && itemRect.left < listItemsRect.right;
  
          return verticallyVisible && horizontallyVisible;
        },
        toggleActive(id) {
          this.active = this.active === id ? null : id;
        }
      }))
    };
    if (window.Alpine) {
      defineXStoreLocator();
    } else {
      document.addEventListener("alpine:init", defineXStoreLocator);
    }
  });
}

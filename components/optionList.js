class OptionList {
    static get storage() {
        return {
            section: 'storage',
            load: 'load',
            save: 'save',
            saveTo: 'save-to',
            noneCategory: 'preferences-none-category',
            getCategoryId: (index) => 'category-' + index
        };
    }

    static get marking() {
        return {
            mark: 'mark',
            unmark: 'unmark',
            setColour: 'palette'
        };
    }

    static get noting() {
        return {
            add: 'note-add',
            remove: 'note-remove',
            navigation: 'note-navigation'
        };
    }

    static get other() {
        return {
            preferences: 'preferences'
        };
    }
}

export { OptionList };

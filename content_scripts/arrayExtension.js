class ArrayExtension {
    static runForEach(array, callback) {
        if (!callback)
            return;

        const length = (array || []).length;
        
        for (let i = 0; i < length; ++i)
            callback(array[i], i);
    }

    static contains(array, element) {
        const length = (array || []).length;

        for (let i = 0; i < length; ++i)
            if (array[i] === element)
                return true;

        return false;
    }
}

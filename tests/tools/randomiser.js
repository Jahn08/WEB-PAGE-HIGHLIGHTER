class Randomiser {
    static getRandomNumber(upToNum) { return Math.floor(Math.random() * upToNum); }

    static getRandomNumberUpToMax() { return Randomiser.getRandomNumber(Number.MAX_VALUE); }

    static getRandomArrayItem(array) { 
        return array[this.getRandomNumber(array.length - 1)];
    }

    static getRandomBoolean() { return Randomiser.getRandomNumber(100) % 2 === 0; }

    static getRandomString() { return '' + Randomiser.getRandomNumberUpToMax(); }

    static getRandomUri() {
        return 'https://test/' + Randomiser.getRandomNumber(10000000);
    }
}

export { Randomiser };

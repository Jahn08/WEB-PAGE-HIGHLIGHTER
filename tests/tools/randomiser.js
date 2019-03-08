class Randomiser {
    static getRandomNumber(upToNum) { return Math.floor(Math.random() * upToNum); }

    static getRandomNumberUpToMax() { return Randomiser.getRandomNumber(Number.MAX_VALUE); }
}

export { Randomiser };

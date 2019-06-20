class Randomiser {
    static getRandomNumber(upToNum) { return Math.floor(Math.random() * upToNum); }

    static getRandomNumberUpToMax() { return Randomiser.getRandomNumber(Number.MAX_VALUE); }

    static getRandomBoolean() { return Randomiser.getRandomNumber(100) % 2 === 0; }
}

export { Randomiser };

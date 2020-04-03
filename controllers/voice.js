const express = require('express');
const router = require('express').Router();
const verify = require("../models/verifyToken");
const VoiceMethods = require('../models/Voice');

var cookieParser = require('cookie-parser');
router.use(cookieParser());




//Static files
router.use("/", express.static("assets"));

//login GET
router.get("/start", async (req, res) => {

    //All words(incl. the wrong ones) are stored in memory
    let userBackupId = req.cookies['userBackupId'];
    console.log(userBackupId);
    let userWords1 = await VoiceMethods.getUserWords(userBackupId);
    console.log(userWords1);
    res.cookie("hej", "hej-test");
    let userWords2 = req.cookies['hej'];
    console.log(userWords2);
    // global.userWords = await VoiceMethods.getUserWords();

    //Counter for the words sent to test
    let words = req.cookies['words'];
    console.log(words);
    let counterWordsInt = await VoiceMethods.getCounterWords(words);
    res.cookie("counterWords", parseInt(counterWordsInt));
    let counterWords = req.cookies['counterWords'];
    // global.counterWords = await VoiceMethods.getCounterWords();

    //Resetting start (word)counter to 0
    let counterStartInt = await VoiceMethods.resetStartCounter();
    res.cookie("startCounter", parseInt(counterStartInt));
    let startCounter = req.cookies['startCounter'];
    // global.startCounter = await VoiceMethods.resetStartCounter();

    //Resetting start score to 0
    let scoreInt = await VoiceMethods.resetScore();
    res.cookie("score", parseInt(scoreInt));
    let score = req.cookies['score'];
    console.log(score);
    // global.score = await VoiceMethods.resetScore();

    //Renders start with info about test
    res.render("../views/start.ejs");
});
//login POST
router.post("/start", (req, res) => {
    res.redirect('./talk-login');
});

//talk-login GET
router.get("/talk-login", verify, async (req, res) => {
    //Verifies(verify middleware) that user logged in.
    if (req.user == "Access denied") {
        res.render("../views/error.ejs", {msg: "Please login"});
    } else if (req.user == "Invalid token") {
        res.render("../views/error.ejs", {msg: "Wrong email or password"});
    } else {
        //Sets the current word that is sent to user
        let userWords = req.cookies['userWords'];
        let startCounter = parseInt(req.cookies['startCounter']);

        res.cookie("currentWord", Object.keys(userWords)[parseInt(startCounter)]);
        // global.currentWord = Object.keys(global.userWords)[global.startCounter];

        //Sets the current res_words that is used to compare if correct(success)
        let currentWord = req.cookies['currentWord'];

        res.cookie("currentResWords", userWords[currentWord]);
        // global.currentResWords = global.userWords[global.currentWord];

        //Check if test if finished or not
        let counterWords = parseInt(req.cookies['counterWords']);

        // console.log(userWords);
        // console.log(startCounter);
        // console.log(userWords[startCounter]));

        console.log(counterWords);
        console.log(startCounter);
        if (counterWords > startCounter) {
            res.render("../views/talk.ejs", { msg: currentWord });
        } if (counterWords == startCounter) {
            let userBackupId = req.cookies['userBackupId'];
            let score = parseInt(req.cookies['score']);

            // Adds score to statistics in DB
            await VoiceMethods.addToStatistics(userBackupId, parseInt(score), parseInt(counterWords));
            res.render("../views/finished.ejs", {score: parseInt(score), total: parseInt(counterWords)});
        }

    }
});


//submit POST
router.post("/submit", async (req, res) => {
    //Adds one(1) to startCounter
    let startCounter = req.cookies['startCounter'];
    let startCounterInt = parseInt(startCounter);
    res.cookie("startCounter", parseInt(startCounterInt+1));
    // global.startCounter = global.startCounter + 1;

    //Sets submitted word to memory(so addToNrOfTries can run correctly)
    res.cookie("subWord", req.body.value.toLowerCase());
    // global.subWord = req.body.value.toLowerCase();


    //Checks if word exists under res_word for current word
    let currentResWords = req.cookies['currentResWords'];
    let subWord = req.cookies['subWord'];
    let checkIfWordExist = currentResWords.includes(subWord);

    if (checkIfWordExist == true) {
        // word exist
        // global.result = "rätt";
        let score = req.cookies['score'];
        let userBackupId = req.cookies['userBackupId'];
        let subWord = req.cookies['subWord'];

        await VoiceMethods.addToNrOfTries(userBackupId,subWord);
        let scoreInt = parseInt(score)
        res.cookie("score", parseInt(scoreInt+1));
        // global.score = global.score + 1;
        res.redirect('./talk-login');
    } else {
        // word does not exist

        // Check that no clash with other word
        let words = req.cookies['words'];
        let checkNoClash = currentResWords.includes(subWord);

        // let checkNoClash = words.includes(subWord); // KANSKE BEHÅLLA?

        if (checkNoClash == true) {
            //Clash. Word not added to res_word
            // global.result = "fel";
            res.redirect('./talk-login');
        } else {
            //No clash. Word added to res_word
            // global.result = "fel";
            let userBackupId = req.cookies['userBackupId'];
            let currentWord = req.cookies['currentWord'];
            let subWord = req.cookies['subWord'];
            await VoiceMethods.addResWord(userBackupId, currentWord, subWord);
            res.redirect('./talk-login');
        }
    }
});

//submit GET
router.get("/submit", async (req, res) => {
    let result = req.cookies['result'];
    let subWord = req.cookies['subWord'];

    res.render("../views/result.ejs", {msg: result, result: subWord});
});


//restart GET
router.get("/restart", verify, async (req, res) => {
    //Resets all memory variables and loads in all words (incl new res_words)
    let words = await VoiceMethods.getWords();
    res.cookie("words", words);
    // global.words = await VoiceMethods.getWords();


    let userBackupId = req.cookies['userBackupId'];
    await VoiceMethods.setUserWords(words, userBackupId);

    let userWords = await VoiceMethods.getUserWords(userBackupId);


    let counterWords = await VoiceMethods.getCounterWords(words);

    res.cookie("userWords", userWords);
    res.cookie("counterWords", parseInt(counterWords));
    res.cookie("startCounter", parseInt(0));
    res.cookie("score", parseInt(0));

    res.redirect('./talk-login');
});


module.exports = router;

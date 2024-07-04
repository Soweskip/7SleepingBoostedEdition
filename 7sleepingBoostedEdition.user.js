// ==UserScript==
// @name                7sleepingBoostedEdition
// @namespace           .
// @version             1.0
// @description         Automating solve of 7speaking tests
// @updateURL           https://raw.githubusercontent.com/Soweskip/7SleepingBoostedEdition/main/7sleeping.user.js
// @downloadURL         https://raw.githubusercontent.com/Soweskip/7SleepingBoostedEdition/main/7sleeping.user.js
// @author              Gamray
// @match               https://user.7speaking.com/*
// @icon                https://www.google.com/s2/favicons?sz=64&domain=7speaking.com
// @grant               none
// ==/UserScript==

const menu7Sleeping = `\
    <div style="padding-right: 80px;">
        <button id="7sleeping-dropdown" class="MuiButtonBase-root-162 MuiButton-root-135 button MuiButton-containedPrimary-144"
                style="background-color: #FF3364;
                       color: #FFFFFF;
                       border: 0;
                       cursor: pointer;
                       padding: 5px 16px 7px 16px;
                       min-width: 11.25rem;
                       min-height: 1.8rem;
                       font-family: sofia-pro, Arial, sans-serif;
                       border-bottom-left-radius: 6px;
                       border-bottom-right-radius: 6px;
                       border-top-left-radius: 6px;
                       border-top-right-radius: 6px">
            <span>7sleeping</span>
        </button>
        <div id="dropdown-content"
              style="background-color: #FF3364;
                     display: none;
                     color: #FFFFFF;
                     border: 0;
                     padding: 5px 16px 7px 16px;
                     min-width: 11.25rem;
                     min-height: 1.8rem;
                     font-family: sofia-pro, Arial, sans-serif;
                     border-bottom-left-radius: 6px;
                     border-bottom-right-radius: 6px;">
            <ul>
                <li>
                    Errors (%)
                    <input id="7sleeping-errors" class="dropdown-sub-buttons" type="number" value="${localStorage.getItem('errors') ?? 30}" max="100"
                            style="width: 2.5rem;
                                   -webkit-appearance: none;
                                   -moz-appearance: textfield;
                                   appearance: textfield;
                                   margin-left: 17px;
                                   text-align: center;
                                   float: right;
                                   background-color: #e72f5b;
                                   color: #ffffff;
                                   border: none;
                                   border-radius: 10px;"/>
                </li>
                <li style="margin-top: 5px;">
                    Max delay  (S)
                    <input id="7sleeping-delay" class="dropdown-sub-buttons" type="number" value="${localStorage.getItem('maxDelay') ?? 30}" max="3000"
                            style="width: 2.5rem;
                                   -webkit-appearance: none;
                                   -moz-appearance: textfield;
                                   appearance: textfield;
                                   margin-left: 20px;
                                   text-align: center;
                                   float: right;
                                   background-color: #e72f5b;
                                   color: #ffffff;
                                   border: none;
                                   border-radius: 10px;"/>
                </li>
                <li style="margin-top: 15px;
                           display: flex;
                           justify-content: center;
                           align-items: center;">
                    <span id="time-to-sleep" class="dropdown-sub-buttons"
                          style="background-color: #e72f5b;
                                 cursor: pointer;
                                 width: 5rem;
                                 color: #ffffff;
                                 border: none;
                                 border-radius: 10px;
                                 text-align: center;
                                 padding-bottom: 5px;
                                 font-size: 18px;">
                             ${JSON.parse(localStorage.getItem('isScriptRunning')) ? 'Stop / Reinit' : 'Start'}
                    </span>
                </li>
            </ul>
        </div>
    </div>`;


const colorNotEnabled = "#FF3364";
const colorNotEnabledDark = "#e72f5b";
const colorEnabled = "#76DED7";
const colorEnabledDark = "#6dc8c2";

(function () {
    'use strict';

    const sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay))

    let enabled = false
    let errors = localStorage.getItem('errors') ?? 30;
    let delay = localStorage.getItem('delay') ?? 30

    let allQuizzTypes = ["fill", "grammar", "choice"]

    /* CUSTOM FUNCTIONS */
    function unifyString(str) {
        // removing spaces to avoid problems
        str = str.toString().toLowerCase()  // In case the answer is an int
        return str.trimEnd()
    }

    function randint(min, max) {
        return Math.floor(Math.random() * (max - min + 1) + min)
    }


    /* QUIZZ RELATED FUNCTIONS */
    function getQuizzObject() {
        let question_div = document.querySelector(".question")
        if (question_div == undefined) { return undefined }

        let reactKey = Object.keys(question_div)[0]
        console.log("[DEBUG] - ", reactKey);

        let curr_kc = question_div[reactKey]

        // we go down in the object until we find "answerOptions" in the attributes
        while (curr_kc.memoizedProps.answerOptions == undefined) {
            curr_kc = curr_kc.return
            if (curr_kc == undefined) {
                return undefined
            }
        }
        return curr_kc.memoizedProps
    }

    // simply extract quizz type from quizz object
    function getQuizzType(quizz) {
        return quizz.variant
    }

    function getCurrentAnswer(quizz) {
        return unifyString(quizz.answerOptions.answer[0].value)
    }

    // handles form submit
    async function submitAnswer(answer, quizzType) {
        // checking we're still in the quizz
        let quizz_form = document.getElementsByClassName("question__form")[0]
        if (quizz_form == undefined) { return false }

        // extracting the submit button
        let submit = quizz_form.childNodes[2].getElementsByTagName("button")[0]

        let shouldFail = randint(0, 100) < errors ? true : false
        console.log("[DEBUG] - Should fail: ", shouldFail)

        if (quizzType == "fill") {
            if (shouldFail) {
                let resp = await fetch('https://random-word-api.herokuapp.com/word').then((response)=>response.json())
                if (resp[0] == undefined) {
                    answer = "carrots"
                } else {
                    answer = resp[0]
                }
            }
            document.querySelector(".MuiInputBase-input.MuiOutlinedInput-input.MuiInputBase-inputAdornedEnd.MuiOutlinedInput-inputAdornedEnd").focus();
            document.execCommand('insertText', false, answer);

            submit.classList.remove("Mui-disabled")
            submit.disabled = false
        } else if (quizzType == "grammar" || quizzType == "choice") {
            let choices = quizz_form.childNodes[0].childNodes

            let clickedChoice = false
            choices.forEach(function (choice) {
                let value = unifyString(choice.childNodes[0].textContent)
                console.log("[DEBUG] - Choice: " + value)
                if (value == answer) {
                    if (!shouldFail) {
                        choice.click()
                        clickedChoice = true
                    }
                } else {
                    if (shouldFail) {
                        choice.click()
                        clickedChoice = true
                    }
                }
            })

            if (clickedChoice == false) {
                console.log("[DEBUG] - Could not find the answer in the choices, exiting...")
                return false
            }
        }

        await sleep(randint(1000, delay * 1000))
        submit.click()  // validate
        await sleep(randint(1000, 2000))
        submit.click()  // continue
        return true
    }

    // "main" function when solving a quizz
    async function solveCurrentQuizz() {
        while (true) {
            if (!JSON.parse(localStorage.getItem('isScriptRunning'))) {
                console.log('Interuption du script pendant une résolution')
                return false;
            }
            let quizzObject = getQuizzObject()
            if (quizzObject == undefined) {
                console.log("Quizz ended ! on redirige au suivant")
                loadTodoQuizs()
                redirectToNextQuiz()
                return false
            }

            let quizzType = getQuizzType(quizzObject)
            if (!allQuizzTypes.includes(quizzType)) {
                console.log("Uknown quizz type: \"" + quizzType + "\", exiting")
                localStorage.setItem('isScriptRunning', false)
                return false
            }

            if (!document.getElementsByClassName("question__form")[0].childNodes[2].getElementsByClassName("Mui-disabled").length) {
                console.log('déjà répondu à cette question')
                document.getElementsByClassName("question__form")[0].childNodes[2].getElementsByTagName("button")[0].click()
            } else {
                let answer = getCurrentAnswer(quizzObject)
                console.log("[DEBUG] - Current answer is \"" + answer + "\"")
                let result = await submitAnswer(answer, quizzType)
                if (!result) {
                    console.log("[DEBUG] - Solve failed")
                    localStorage.setItem('isScriptRunning', false)
                    return false
                }
            }
            await sleep(1500)
        }
    }

    setTimeout(once_loaded, 1000);

    async function once_loaded() {
        while (true) {
            let dropdownButton = document.getElementById('7sleeping-dropdown')
            if (dropdownButton == undefined && document.getElementsByClassName("quiz__container") != undefined) {
                if (document.getElementsByClassName("stepper")[0] != undefined) {
                    document.getElementsByClassName("stepper")[0].innerHTML += menu7Sleeping

                    dropdownButton = document.getElementById('7sleeping-dropdown')
                    dropdownButton.addEventListener("click", invertDropdown, false);

                    let startButton = document.getElementById("time-to-sleep")
                    startButton.addEventListener("click", start7Sleeping, false);

                    let errorsPercent = document.getElementById("7sleeping-errors");
                    if (!localStorage.getItem('errors')) {
                        localStorage.setItem('errors', 30)
                    }

                    if (localStorage.getItem('errors') != errorsPercent.value) {
                        localStorage.setItem('errors', errorsPercent.value)
                    }
                    errorsPercent.addEventListener("input", function () {
                        if (errorsPercent.value == "") {
                            errors = 30
                            console.log("[DEBUG] - New error value: ", errors)
                            return
                        }

                        let value = parseInt(errorsPercent.value)
                        if (value > 100) {
                            errors = 100
                        } else if (value < 0) {
                            errors = 0
                        } else {
                            errors = value
                        }
                        localStorage.setItem('errors', value)
                        console.log("[DEBUG] - New error value: ", errors)
                    })

                    let maxDelay = document.getElementById("7sleeping-delay");
                    if (!localStorage.getItem('maxDelay')) {
                        localStorage.setItem('maxDelay', 10)
                    }

                    if (localStorage.getItem('maxDelay') != maxDelay.value) {
                        localStorage.setItem('maxDelay', maxDelay.value)
                    }

                    maxDelay.addEventListener("input", function () {
                        if (maxDelay.value == "") {
                            delay = 2
                            console.log("[DEBUG] - New delay value: ", delay)
                            return
                        }

                        let value = parseInt(maxDelay.value)
                        if (value > 30) {
                            delay = 30
                        } else if (value < 2) {
                            delay = 2
                        } else {
                            delay = value
                        }
                        console.log("[DEBUG] - New delay value: ", delay)
                    })
                }

                if (JSON.parse(localStorage.getItem('isScriptRunning'))) {
                    console.log('script running after redirection')
                    await sleep(3000)
                    await loadTodoQuizs();

                    if (JSON.parse(localStorage.getItem('quizsTodo'))[0].completion === 0) {
                        await solveCurrentQuizz();
                    } else {
                        console.log('quiz déjà complété');
                    }

                    await sleep(2000)
                    redirectToNextQuiz();
                } else {
                    console.log('scritp not running')
                }
            }
            await sleep(1000)
        }
    }

    function invertDropdown() {
        let button = document.getElementById('7sleeping-dropdown')
        let dropdown = document.getElementById('dropdown-content')

        if (dropdown.style.display == "none") {
            button.style.borderBottomRightRadius = "0px"
            button.style.borderBottomLeftRadius = "0px"
            dropdown.style.display = "flex";
        } else {
            button.style.borderBottomRightRadius = "6px"
            button.style.borderBottomLeftRadius = "6px"
            dropdown.style.display = "none"
        }
    }

    async function start7Sleeping() {
        localStorage.setItem('isScriptRunning', !JSON.parse(localStorage.getItem('isScriptRunning')))
        console.log(JSON.parse(localStorage.getItem('isScriptRunning')) ? 'Stop' : 'Start')

        document.querySelector("#time-to-sleep").textContent = (JSON.parse(localStorage.getItem('isScriptRunning')) ? 'Stop' : 'Start') ?? ''

        if (!JSON.parse(localStorage.getItem('isScriptRunning'))) {
            console.log('stop script')
            return;
        }
        // Load quizzes to do
        await loadTodoQuizs();
        console.log('Quizs loaded')
        solveCurrentQuizz()
    }

    function redirectToNextQuiz() {
        if (!JSON.parse(localStorage.getItem('isScriptRunning'))) {
            return
        }
        let quizsTodo = JSON.parse(localStorage.getItem('quizsTodo'));
        console.log('redirection vers quiz :', quizsTodo[0].id)
        if (quizsTodo.length > 0) {
            let firstQuizId = quizsTodo[0].id;
            let quizUrl = 'https://user.7speaking.com/quiz/news/' + firstQuizId;

            // Redirect to the quiz page
            window.location.href = quizUrl;
        } else {
            console.log('[DEBUG] No quizzes to solve');
        }
    }

    function getRandomInt(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    async function loadTodoQuizs() {
        let url = `https://www.lms.7speaking.com/apiws/news.cfc`;
        let params = {
            sessionId: localStorage.sessionId,
            li: 'FRE',
            languagetaught: 'ENG',
            method: 'getSearch',
            keyword: '',
            interests: '',
            level: 4,
            type: 'texte%2Cvideo',
            bymostpopular: false,
            studied: '',
            perpage: 5
        };
        console.log('params', params);

        // Init storage
        if (!localStorage.getItem('quizPage')) {
            localStorage.setItem('quizPage', 1);
        }

        if (!localStorage.getItem('quizsTodo')) {
            localStorage.setItem('quizsTodo', JSON.stringify([]));
        }

        let queryString = new URLSearchParams(params).toString();
        let fullUrl = `${url}?${queryString}&page=${parseInt(localStorage.getItem('quizPage'))}`;

        console.log("[DEBUG] Request URL: ", fullUrl);

        try {
            let response = await fetch(fullUrl);
            if (response.ok) {
                let jsonResponse = await response.json();
                let newQuizzes = jsonResponse.payload.data.filter(quiz => quiz.completion === 0);

                localStorage.setItem('quizsTodo', JSON.stringify(newQuizzes));
                if (newQuizzes.length === 0) {
                    console.log('On change de page car tous complétés');
                    localStorage.setItem('quizPage', parseInt(localStorage.getItem('quizPage')) + 1);
                    await loadTodoQuizs();
                }
                try {
                    const findOldQuiz = newQuizzes.find(quiz => quiz.id == (getQuizzObject()).sourceid);

                    if (findOldQuiz === undefined) {
                        redirectToNextQuiz();
                    }
                } catch {
                }

                return jsonResponse;
            } else {
                console.error("Failed to fetch the URL, status: ", response.status);
            }
        } catch (error) {
            console.error("Failed to fetch the URL: ", error);
        }
    }
})();

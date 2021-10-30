/**
 * Adds classes to create the CSS design for the back of the Uno cards
 * @param {*} cardDiv
 * @param {*} cardSpanInner
 */
function addCSSDesignToBackOfCard(cardDiv, cardSpanInner) {
    cardDiv.classList.add("black");
    cardSpanInner.append("_");
    $(cardSpanInner).css("color", "#c72a18");
    $(cardSpanInner).css("background-color", "#c72a18");
    $(cardSpanInner).css("text-shadow", "#c72a18 1px 1px 1px");
}

/**
 * Adds classes to create the CSS design for the front of the Uno cards
 * @param {*} cardDiv 
 * @param {*} cardSpanInner 
 * @param {*} cardValue 
 */
function addCSSDesignToCard(cardDiv, cardSpanInner, cardValue) {
    switch (cardValue) {
        case "0":
            cardDiv.classList.add("num-0");
            cardSpanInner.append("0");
            break;
        case "1":
            cardDiv.classList.add("num-1");
            cardSpanInner.append("1");
            break;
        case "2":
            cardDiv.classList.add("num-2");
            cardSpanInner.append("2");
            break;
        case "3":
            cardDiv.classList.add("num-3");
            cardSpanInner.append("3");
            break;
        case "4":
            cardDiv.classList.add("num-4");
            cardSpanInner.append("4");
            break;
        case "5":
            cardDiv.classList.add("num-5");
            cardSpanInner.append("5");
            break;
        case "6":
            cardDiv.classList.add("num-6");
            cardSpanInner.append("6");
            break;
        case "7":
            cardDiv.classList.add("num-7");
            cardSpanInner.append("7");
            break;
        case "8":
            cardDiv.classList.add("num-8");
            cardSpanInner.append("8");
            break;
        case "9":
            cardDiv.classList.add("num-9");
            cardSpanInner.append("9");
            break;
        case "buy-2":

            // <div class="card draw2 green"><span class="inner"><span class="mark">+2</span></span></div>
            cardDiv.classList.add("draw2");
            cardSpanInner.append("_");
            $(cardSpanInner).css("color", "white");
            $(cardSpanInner).css("text-shadow", "#fff 1px 1px 1px");
            cardSpanInner.innerHTML = '+2';
            break;
        case "reverse":

            // <div class="card reverse my-card yellow"><span class="inner"><span class="mark">⇄</span></span></div>
            cardDiv.classList.add("reverse");
            cardSpanInner.innerHTML = '⇄';
            break;
        case "block":

            // <div class="card skip my-card yellow"><span class="inner"><span class="mark">⊘</span></span></div>
            cardDiv.classList.add("skip");
            cardSpanInner.innerHTML = '⊘';
            break;
        case "change-color":

            // <div class="card wild black"><span class="inner"><span class="mark">?</span></span></div>
            cardDiv.classList.add("wild");
            cardDiv.classList.add("black");
            cardSpanInner.append("_");
            $(cardSpanInner).css("color", "white");
            $(cardSpanInner).css("text-shadow", "#fff 1px 1px 1px");
            cardSpanInner.innerHTML = '?';
            break;
        case "buy-4":
            
            cardDiv.classList.add("plus-4");
            cardDiv.classList.add("black");
            cardSpanInner.append("_");
            $(cardSpanInner).css("color", "white");
            $(cardSpanInner).css("text-shadow", "#fff 1px 1px 1px");
            cardSpanInner.innerHTML = '+4';

            // div card green
            // let specialClassDiv19 = document.createElement("div");
            // cardSpanInner.append(specialClassDiv19);
            // specialClassDiv19.classList.add("cardsInInnerPlus4");
            // specialClassDiv19.classList.add("card-plus4-green");
            // specialClassDiv19.classList.add("green");

            // let evenInnerSpan1 = document.createElement("span");
            // specialClassDiv19.append(evenInnerSpan1);
            // evenInnerSpan1.classList.add("inner");

            // // div card blue
            // let specialClassDiv192 = document.createElement("div");
            // cardSpanInner.append(specialClassDiv192);
            // specialClassDiv192.classList.add("cardsInInnerPlus4");
            // specialClassDiv192.classList.add("card-plus4-blue");
            // specialClassDiv192.classList.add("blue");

            // let evenInnerSpan12 = document.createElement("span");
            // specialClassDiv192.append(evenInnerSpan12);
            // evenInnerSpan12.classList.add("inner");

            // // div card red
            // let specialClassDiv193 = document.createElement("div");
            // cardSpanInner.append(specialClassDiv193);
            // specialClassDiv193.classList.add("cardsInInnerPlus4");
            // specialClassDiv193.classList.add("card-plus4-red");
            // specialClassDiv193.classList.add("red");

            // let evenInnerSpan13 = document.createElement("span");
            // specialClassDiv193.append(evenInnerSpan13);
            // evenInnerSpan13.classList.add("inner");

            // // div card yellow
            // let specialClassDiv194 = document.createElement("div");
            // cardSpanInner.append(specialClassDiv194);
            // specialClassDiv194.classList.add("cardsInInnerPlus4");
            // specialClassDiv194.classList.add("card-plus4-yellow");
            // specialClassDiv194.classList.add("yellow");

            // let evenInnerSpan14 = document.createElement("span");
            // specialClassDiv194.append(evenInnerSpan14);
            // evenInnerSpan14.classList.add("inner");
            break;
    }
}

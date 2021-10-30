/**
 * deck constructor
 * @param {*} divId
 * @param {*} hidden
 */
function Deck(divId, hidden) {
    this.cards = [];
    this.amtCards = 0;
    this.hand = hidden? $(divId): document.getElementById(divId);
    this.isHidden = hidden;

    /**
     * Add a card to the cards array
     */
    this.addCard = function (card) {
        this.cards.push(card);
        this.amtCards = this.cards.length;
    };

    /**
     * Remove a card from card array
     */
    this.removeCard = function (card) {
        this.cards.splice(card, 1);
        this.amtCards = this.cards.length;
    };

    /**
     * Give player a specific card for cheat code
     */
    this.drawSpecificCard = function (cardInfo) {
        let tempCard = new Card(cardInfo);
        this.addCard(tempCard);
        this.reloadHand();
    };

    /**
     * Give player a random card
     */
    this.drawCard = function (cardInfo) {
        let tempCard = new Card(cardInfo);
        this.addCard(tempCard);
    };

    /**
     * Remove card from hand and reload hand (post-validation of good move)
     */
    this.playCard = function (cardIdx) {
        let wildColorMenuIsInactive = true;
        let card = this.cards[cardIdx];

        if (card?.canBeUsed) { 
            
            if (card.value == "change-color") {
                currentSpecialCard = card;
                document.getElementById("overlay").style.display = "flex";
                document.getElementById("overlay").style.alignItems = "center";
                document.getElementById("overlay").style.justifyContent = "center";
                document.getElementById("overlay").style.height = "100vh";
                return ;
            }

            if (card.value == "buy-4") {
                let color = globalGame.currentGameColor? globalGame.currentGameColor: 'red';
                $(".chosen-wild-card-color .inner").css("background", convertColorToHex(color));
                isColorSelected = true;

                sendMessage({
                    type: 'put-card',
                    data: {
                        cardIds: [card.id],
                        selectedColor: globalGame.currentGameColor
                    }
                })
                return;
            }

            sendMessage({
                type: 'put-card',
                data: {
                    cardIds: [card.id],
                    selectedColor: ''
                }
            })
        }
    };

    /**
     * Return card at index card
     */
    this.getCard = function (card) {
        return this.cards[card];
    };

    /**
     * Reload the player hand to have the most recent cards in player hand
     */
    this.reloadHand = function () {
        if (!this.isHidden) {
            this.hand.innerHTML = "";
            for (let i = 0; i < this.amtCards; i++) {
                let cardDiv = document.createElement("div");
                this.hand.append(cardDiv);
                cardDiv.classList.add("card");
    
                let cardSpan = document.createElement("span");
                cardDiv.append(cardSpan);
                cardSpan.classList.add("inner");
    
                let cardSpanInner = document.createElement("span");
                cardSpan.append(cardSpanInner);
                cardSpanInner.classList.add("mark");
    
                cardDiv.append();
    
                // if (!this.isHidden) {
                if (this.amtCards != 0)
                    addCSSDesignToCard(cardDiv, cardSpanInner, this.getCard(i).value);

                // prevent the discardDeckDiv from being counted as playable cards
                if (this.hand.id != "discardDeckDiv" && globalGame.currentPlayerIndex == mySeatIdx) {
                    cardDiv.classList.add("my-card");
                } else {
                    if (i == discardPile.cards.length - 1) {
                        if (cardDiv.classList.contains("wild") || cardDiv.classList.contains("plus-4")) {
                            cardDiv.classList.add("chosen-wild-card-color");
                        }
                    }
                }

                switch (this.getCard(i).getColorValue()) {
                    case "#0000FF":
                        cardDiv.classList.add("blue");
                        cardDiv.classList.remove("black");
                        break;
                    case "#A60000":
                        cardDiv.classList.add("red");
                        cardDiv.classList.remove("black");
                        break;
                    case "#004f19":
                        cardDiv.classList.add("green");
                        cardDiv.classList.remove("black");
                        break;
                    case "#e5bf00":
                        cardDiv.classList.add("yellow");
                        cardDiv.classList.remove("black");
                        break;
                    default:
                        cardDiv.classList.add("black");
                }
            }
        } else {
            this.hand.find('.uwo-remaining-cards').text(this.amtCards + ' Cards')
        }
    };

    // compare selected card to playfield card
    this.isValid = function (card) {
        //Get in the value by element ID
        let cardColor = this.cards[card].color;
        let cardNumber = this.cards[card].value;

        // will run if there is a stackable card played, +2 or +4
        if (drawStack.stackAmt != 0) {
            if (cardNumber != drawStack.cardValue) {
                return false;
            } else if (cardNumber == 1 && cardColor != "Special") {
                return false;
            } else {
                return true;
            }
        }

        if (
            cardColor == discardPile.cards[discardPile.cards.length - 1].color ||
            cardColor == "Special"
        ) {
            return true;
        }
        if (cardNumber == discardPile.cards[discardPile.cards.length - 1].value) {
            return true;
        }
        return false;
    };

    this.clear = function() {
        this.cards = [];
        this.amtCards = 0;
        if (this.hidden) {
            $(this.hand).empty();
        }
    }
}

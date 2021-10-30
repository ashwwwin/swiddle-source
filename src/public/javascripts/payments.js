// A reference to Stripe.js initialized with your real test publishable API key.
var stripe = Stripe("pk_test_51JXBbaIgaIteUeBqrBCeC930QwGajrnC44Ijc2qx8koQHSBTjCpWhD4qOjuUHFBFAnzA0q9qkgrQXHCmfkTw9qIT00UGhpe0o2");
// The items the customer wants to buy
var purchase = {
  items: [{
    id: "xl-tshirt"
  }]
};

// Calls stripe.confirmCardPayment
// If the card requires authentication Stripe shows a pop-up modal to
// prompt the user to enter authentication details without leaving your page.
var payWithCard = function (stripe, card, clientSecret) {
  loading(true);
  stripe
    .confirmCardPayment(clientSecret, {
      payment_method: {
        card: card
      }
    })
    .then(function (result) {
      if (result.error) {
        // Show error to your customer
        showError(result.error.message);
      } else {
        // The payment succeeded!
        orderComplete(result.paymentIntent.id);
      }
    });
};
/* ------- UI helpers ------- */
// Shows a success message when the payment is complete
var orderComplete = function (paymentIntentId) {
  loading(false);
  document
    .querySelector(".result-message a")
    .setAttribute(
      "href",
      "https://dashboard.stripe.com/test/payments/" + paymentIntentId
    );
  document.querySelector("#purchase-coins-result-msg").classList.remove("hidden");
  document.querySelector("#purchase-coins-pay-button").disabled = true;
};
// Show the customer the error from Stripe if their card fails to charge
var showError = function (errorMsgText) {
  loading(false);
  var errorMsg = document.querySelector("#purchase-coins-error-msg");
  errorMsg.textContent = errorMsgText;
  setTimeout(function () {
    errorMsg.textContent = "";
  }, 4000);
};
// Show a spinner on payment submission
var loading = function (isLoading) {
  if (isLoading) {
    // Disable the button and show a spinner
    document.querySelector("#purchase-coins-pay-button").disabled = true;
    document.querySelector("#purchase-coins-pay-spinner").classList.remove("hidden");
    document.querySelector("#purchase-coins-pay-text").classList.add("hidden");
  } else {
    document.querySelector("#purchase-coins-pay-button").disabled = false;
    document.querySelector("#purchase-coins-pay-spinner").classList.add("hidden");
    document.querySelector("#purchase-coins-pay-text").classList.remove("hidden");
  }
};

//Opens purchase coins
function openPurchaseCoins() {
  $('#purchase-coins-modal').modal('show');
  return;
}


//When user clicks on add coins
$('#add-coins-button').click(function () {
  //Opens the coins shop
  openPurchaseCoins();
})


//Tells the backend to check the shop
function getShop() {
  // sendMessage({
  //   type: 'get-shop-items'
  // });
}


function addShopItems(data) {
  //Gets the number of items in shop
  var shopItemsNum = (data.shopItems).length;
  //Counter to visually add items
  var counter = 0;
  while (counter < shopItemsNum) {
    var shopItem = data.shopItems[counter];
    var item = $('#purchase-coins-item').clone();
    item.removeClass('d-none');
    item.find('#purchase-coins-item-name').text(shopItem.packageName);
    item.appendTo('#purchase-coins-selection');
    // $item.find('.video-title').text(result.title);
    // $item.appendTo('#video-list');
    //console.log(shopItem._id);
    counter += 1;
  }
}

function selectPackage() {
  $("#purchase-coins-payment").removeClass('d-none');

  // Disable the button until we have Stripe set up on the page
  document.querySelector("#purchase-coins-pay-button").disabled = true;
  fetch("/create-payment-intent", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(purchase)
    })
    .then(function (result) {
      return result.json();
    })
    .then(function (data) {
      var elements = stripe.elements();
      var style = {
        base: {
          color: "#32325d",
          fontFamily: 'Arial, sans-serif',
          fontSmoothing: "antialiased",
          fontSize: "16px",
          "::placeholder": {
            color: "#32325d"
          }
        },
        invalid: {
          fontFamily: 'Arial, sans-serif',
          color: "#fa755a",
          iconColor: "#fa755a"
        }
      };
      var card = elements.create("card", {
        style: style
      });
      // Stripe injects an iframe into the DOM
      card.mount("#purchase-coins-card-element");
      card.on("change", function (event) {
        // Disable the Pay button if there are no card details in the Element
        document.querySelector("#purchase-coins-pay-button").disabled = event.empty;
        document.querySelector("#purchase-coins-error-msg").textContent = event.error ? event.error.message : "";
      });
      var form = document.getElementById("purchase-coins-payment-form");
      form.addEventListener("submit", function (event) {
        event.preventDefault();
        // Complete payment when the submit button is clicked
        payWithCard(stripe, card, data.clientSecret);
      });
    });

}
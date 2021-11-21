//Adjust these settings
const pricePerFlat = "0.175";
var decimalPlaces = 4;
var NFT_ADDRESS = '0xd01C7265Bf42ea04dCE3586d411940093fB3ABda';
var CONTRACT_ADDRESS = '0x22D5fA6f120F9bbb381303c65F37C9F768510055';
var ETHERSCAN_URL = `https://api-rinkeby.etherscan.io/api?module=stats&action=tokensupply&contractaddress=${NFT_ADDRESS}&apikey=6FZA8XJVT9J6G5SCJUUC27UGU16DR29S51`;

// Import the contract file
var ogFlatsNFT;
$.getJSON("/libs/OGFlatFactory.json", function(json) {
  ogFlatsNFT = json; 
});

var totalPrice = pricePerFlat;
var metamaskDetected = false;
var accounts;

$(document).ready(function() {
  if (typeof window.ethereum !== 'undefined') {
    metamaskDetected = true;
  } else {
    metamaskDetected = false;
  }

  if (!metamaskDetected && window.todesktop && window.location.pathname == '/sign-in') {
    $('#metamask-login-container').hide();
  }

  updateMintCounter();
});


$('#metamask-signin').click(async function() {
  if (metamaskDetected) {
    console.log('MetaMask is detected');
    $.ajax({
      url: 'metamask-login',
      type: 'post',
      dataType: 'json',
      data: {
        ethId: (await ethereum.request({ method: 'eth_requestAccounts' }))[0]
      },
      success: async function (data) {
        if (data) {
          console.log(data);
          var accounts = await ethereum.request({ method: 'eth_accounts' });
          
          console.log(accounts[0]);
        }
      }
    });
  } else {
    alert('MetaMask could not be detected');
  }
})

function updateMintCounter(){
  $.getJSON(ETHERSCAN_URL, function(data) {
    $('#mint-counter').text(`Total minted: ${(data.result).toLocaleString("en-US")}/10,000 Flats`);
  });

  //Checks mint number every 15 seconds
  setTimeout(function(){
    updateMintCounter();
  }, 15000);
}


function calculateTotalPrice() {
  var mintQuantity = parseInt($('#mint-quantity').val());
  console.log(mintQuantity);

  if (!mintQuantity) {
    $('#mint-quantity').val("1");
    mintQuantity = 1;
  }

  console.log(mintQuantity);

  var total = mintQuantity * pricePerFlat;

  //Just to make it gramatically correct
  var thePluraler;
  if (mintQuantity > 1) {
    thePluraler = 's';
  } else {
    thePluraler = '';
  }

  totalPrice = (parseFloat(total).toPrecision(decimalPlaces)).toString();

  //Removing insignificant zeros (Checks if decimal, if so, removes insignificant zeros)
  while (totalPrice.endsWith('0') & !!(totalPrice % 1)) {
    totalPrice = totalPrice.slice(0, -1);
  }

  //And finally showing the total price
  $('#total-price').text(`Total is ${totalPrice.toLocaleString("en-US")} ETH for ${mintQuantity.toLocaleString("en-US")} Flat${thePluraler}`)
}


$('#mint-og-flat').click(async function () {
  
  $('#mint-og-flat').css('pointer-events', 'none');

  //Checking if user is logged in 
  accounts = await ethereum.request({ method: 'eth_requestAccounts' });
  console.log("accounts", accounts);
  if (metamaskDetected && accounts[0]) {
    try {
      const provider = await new ethers.providers.Web3Provider(ethereum);
      const signer = await provider.getSigner();
      const connectedContract = await new ethers.Contract(CONTRACT_ADDRESS, ogFlatsNFT.abi, signer);
      console.log(connectedContract);
      console.log(totalPrice);
      let nftTxn = await connectedContract.mint('0', accounts[0], { value: ethers.utils.parseEther(totalPrice) });
      $('#mint-og-flat').text('Waiting for ether');

      $('#mint-og-flat').text('Minting...');
      await nftTxn.wait();
      console.log(nftTxn);

      $('#success-address').show();
      $('#success-address').css('cursor', 'pointer');
      $('#success-address').text(`https://rinkeby.etherscan.io/tx/${nftTxn.hash}`);
      $('#success-address').unbind('click');
      $('#success-address').click(function() {
        window.open(`https://rinkeby.etherscan.io/tx/${nftTxn.hash}`);
      });


      $('#mint-og-flat').text('Mint again');
      $('#mint-og-flat').css('cursor', 'pointer');
      $('#mint-og-flat').css('pointer-events', 'auto');
    } catch (error) {
      $('#mint-og-flat').text('Mint');
      $('#mint-og-flat').css('cursor', 'pointer');
      $('#mint-og-flat').css('pointer-events', 'auto');
      console.log(error.message);
    }
  } else {
      alert('Please login to MetaMask');
      $('#metamask-signin').click();
  }

  updateMintCounter();

  // $('#mint-og-flat').text('Mint');
  // $('#mint-og-flat').css('cursor', 'pointer');
  // $('#mint-og-flat').css('user-events', 'allow');
  // $('#mint-og-flat').prop('disabled', false);
});
var NFT_ADDRESS = '0x6fdD6bda3b3F06187141D02523dE8be33E7bDF6f';
var CONTRACT_ADDRESS = '0x6E1a4F1bfd4B01348696261048a6deA43FC48eA5';

// Import the contract file
var ogFlatsNFT;
$.getJSON("/libs/OGFlatFactory.json", function(json) {
  ogFlatsNFT = json; 
});


var metamaskDetected = false;
var accounts;

$(document).ready(function() {
  if (typeof window.ethereum !== 'undefined') {
    metamaskDetected = true;
  } else {
    metamaskDetected = false;
  }
});


$('#metamask-signin').click(async function() {
  // if (metamaskDetected) {
  //   console.log('MetaMask is detected');
  //   $.ajax({
  //     url: 'metamask-login',
  //     type: 'post',
  //     dataType: 'json',
  //     data: {
  //       ethId: (await ethereum.request({ method: 'eth_requestAccounts' }))[0]
  //     },
  //     success: async function (data) {
  //       if (data) {
  //         console.log(data);
  //         var accounts = await ethereum.request({ method: 'eth_accounts' });
          
  //         console.log(accounts[0]);
  //       }
  //     }
  //   });
  // } else {
  //   console.log('MetaMask could not be detected');
  // }
})

function updateMintCounter(){
  var url = `https://api-rinkeby.etherscan.io/api?module=stats&action=tokensupply&contractaddress=${NFT_ADDRESS}&apikey=6FZA8XJVT9J6G5SCJUUC27UGU16DR29S51`;
  $.getJSON(url, function(data) {
    $('#mint-counter').text(`Total minted: ${data.result}/10,000 Flats`);
  });
}

$('#mint-og-flat').click(async function () {
  
  $('#mint-og-flat').css('cursor', 'not-allowed');
  $('#mint-og-flat').css('user-events', 'none');

  //Checking if user is logged in 
  accounts = await ethereum.request({ method: 'eth_requestAccounts' });
  console.log("accounts", accounts);
  if (metamaskDetected && accounts[0]) {
    try {
      const provider = await new ethers.providers.Web3Provider(ethereum);
      const signer = await provider.getSigner();
      const connectedContract = await new ethers.Contract(CONTRACT_ADDRESS, ogFlatsNFT.abi, signer);

      $('#mint-og-flat').text('Waiting for ether');
      let nftTxn = await connectedContract.mint('0', accounts[0], { value: ethers.utils.parseEther("0.75") });

      console.log(connectedContract);

      $('#mint-og-flat').text('Minting...');
      await nftTxn.wait();

      $('#mint-og-flat').text('Mint again');

      console.log(nftTxn);

      $('#success-address').show();
      $('#success-address').text(`https://rinkeby.etherscan.io/tx/${nftTxn.hash}`);
      $('#success-address').click(function() {
        window.open(`https://rinkeby.etherscan.io/tx/${nftTxn.hash}`);
      });

      $('#success-address').css('cursor', 'pointer');
    } catch (error) {
      console.log(error);
      $('#metamask-signin').click();
    }
  } else {
      alert('Please login to MetaMask');
      $('#metamask-signin').click();
  }

  updateMintCounter();

  $('#mint-og-flat').text('Mint');
  $('#mint-og-flat').css('cursor', 'pointer');
  $('#mint-og-flat').css('user-events', 'allow');
});

updateMintCounter();
// Import the contract file
var ogFlatsNFT;
$.getJSON("/libs/OGFlatsNFT.json", function(json) {
  ogFlatsNFT = json; 
});

// const nftContractFactory =  ethers.getContractFactory("ogFlatsNFT");


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
    console.log('MetaMask could not be detected');
  }
})



$('#mint-og-flat').click(async function () {
  
  $('#mint-og-flat').css('cursor', 'not-allowed');
  $('#mint-og-flat').css('user-events', 'none');


  //Checking if user is logged in 
  accounts = await ethereum.request({ method: 'eth_requestAccounts' });
  var CONTRACT_ADDRESS = '0xA4B0E4C3b92D298aa39229d318523A3F05000666';
  if (metamaskDetected && accounts[0]) {
    // $.ajax({
    //   url: 'mint-nft',
    //   type: 'post',
    //   dataType: 'json',
    //   data: {
    //     ethereum: ethereum,
    //     ownAddress: accounts[0],
    //   },
    // });

      const provider = await new ethers.providers.Web3Provider(ethereum);
      const signer = await provider.getSigner();
      const connectedContract = await new ethers.Contract(CONTRACT_ADDRESS, ogFlatsNFT.abi, signer);

      $('#mint-og-flat').text('Waiting for ether');
      let nftTxn = await connectedContract.mint('0', accounts[0], { value: ethers.utils.parseEther("0.175") } );

      $('#mint-og-flat').text('Minting...');
      await nftTxn.wait();

      console.log(nftTxn);
      
      console.log(`Fresh off the press, https://rinkeby.etherscan.io/tx/${nftTxn.hash}`);
  } else {
    // alert('Please login to MetaMask');
    // $('#metamask-signin').click();
  }


  $('#mint-og-flat').text('Mint');
  $('#mint-og-flat').css('cursor', 'pointer');
  $('#mint-og-flat').css('user-events', 'allow');
});
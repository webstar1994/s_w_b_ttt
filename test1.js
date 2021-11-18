//######################set condition && variables
//#####################################################
const Web3 = require('web3');
const fileC = require('./util/file');
const core_func = require('./util/core_func');
const express = require('express')
const http = require('http')
const app = express();
// const server = http.createServer(app).listen(3008, () => console.log(`Listening on 3008`));
const enableMiniAudit = true;

let tokenDetected = 0;
let tokenBought = 0;
let walletBalance = 0;

let snipeBNBAmount = 0.00025;
let transactionRevertTime = 10000; //number of seconds after transaction processes to cancel it if it hasn't completed
let gasAmount = 300000;
let gasPrice = 5;
let bscScanAPIKey = '';
let observeOnly = false;
//contract
const pacaAbi = require('./abis/PancakeAbi');
const pancakeABI = pacaAbi.pancakeABI;
const listeningABI = pacaAbi.listeningABI;
const tokenNameABI = pacaAbi.tokenNameABI;
const WBNBAddress = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';
const pancakeSwapRouterAddress = '0x10ED43C718714eb63d5aA57B78B54704E256024E'; //load config data from JSON file into program
const pancakeSwapFactoryAddress = '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73'; //read from JSON later
const walletAddress = '0xbBCB5094CF3eaa97Ef7ca6E01DfbE60536a57529';
const private_key = ''; //private key is kept safe and only used in the program
const bscURL = "wss://bsc-ws-node.nariox.org:443";

console.log('--------------------settingProvider------------------------');
const getProvider = () => {
    const provider = new Web3.providers.WebsocketProvider(bscURL)
    provider.on('connect', () => {
        console.log('Provider Connected');
        startBot();
    })
    provider.on('error', e => {
      console.error('WS Error')
      web3_bsc.setProvider(getProvider())
    })
    provider.on('end', e => {
      console.error('WS End')
      web3_bsc.setProvider(getProvider())
    })

    return provider
  }
const web3_bsc = new Web3(getProvider());
const listeningPacaContract = new web3_bsc.eth.Contract(listeningABI,pancakeSwapFactoryAddress);

//###################### start bot
//#####################################################
let startBot = async () => {
    setTimeout(()=>{
    getListOfPaCaTokens();
    },1000)
}
//###################### get list of tokens
//#####################################################
let getListOfPaCaTokens = async()=>{
    console.log('--------------------collectingTokens------------------------');
    listeningPacaContract.events.PairCreated({
        fromBlock: 'latest'
    }, function(error, event){ 
        console.log('??->->->->->->event catched--___' + core_func.strftime(Date.now())+"__")
        foundToken(event);
    })
    .on('data', function(event){
        // console.log('datahere')
        // console.log(event); // same results as the optional callback above
        // foundToken(event);
    })
    .on('changed', function(event){
        // console.log('changed here')
        // remove event from local database
    })
    .on('error', function(event){
        // console.log('error here')
        // remove event from local database
    });
}
//######################found tokens
//#####################################################
let foundToken = async (event)=>{
    try{
        const contents = JSON.parse(JSON.stringify(event));
        const token1 = contents['returnValues']['token1'];
        if(true||token1 == "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c"){// we check if pair is WBNB, if not then ignore it
            const tokenAddress = contents['returnValues']['token0'];
            const getTokenName = new web3_bsc.eth.Contract(tokenNameABI,tokenAddress);
            const tokenName = await getTokenName.methods.name().call();
            console.log(tokenName)
            const tokenSymbol = await getTokenName.methods.symbol().call();
            console.log(":) _____-> " + core_func.strftime(Date.now()) + "_[New Token] detected: " + "_tokenName_->" + tokenName + " (" + tokenSymbol + ") _tokenAddress_->" + tokenAddress);
            tokenDetected ++;
            //__________________________mini audit feature____________________________
            console.log("_________[Token] started mini audit...")

        }
    }catch(err){
        console.log(err)
        console.log('    shit!!!. This is no WBNB. Let\'s wait other event.')
    }

}
//######################token buy
//#####################################################
let buyToken = async() => {

}
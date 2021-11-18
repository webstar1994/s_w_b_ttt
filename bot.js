const ethers = require('ethers');
const Web3 = require('web3');
const {JsonRpcProvider} = require("@ethersproject/providers");
const Tx = require('./ethereumjs-tx');
const {ChainId, Token, TokenAmount, Fetcher, Pair, Route, Trade, TradeType, Percent} = 
require('@pancakeswap-libs/sdk');
const axios = require('axios');

const core_func = require('./util/core_func');
const abisData = require('./abis/PancakeAbi');

//*****variables******//
const walletAddress = "0x8B7D9a9995E3BBDAEEE7B50e47b9c3732000B873";
const privateKey = "d9934722271b9e2d98a785964dc74dac20cf9c9fd18119543508a4131de9bb90";
const bscScanKey = "4UTIERIGCXW3UVIXD2EWS7349P3TJW5VM1";

const url = {
    bscWSS:"wss://bsc-ws-node.nariox.org:443",
    bscSeed1:"https://bsc-dataseed1.binance.org/",
}
const address = {
  wbnb:'0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
  pancakeSwapRouter:'0x10ED43C718714eb63d5aA57B78B54704E256024E',
  pancakeSwapFactory:'0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73',
};
const abi = {
    pancake:abisData.pancakeABI,
    panListening:abisData.listeningABI,
    tokenNameABI:abisData.tokenNameABI,
}
const provider = new JsonRpcProvider(url.bscSeed1);
const factory = new ethers.Contract(address.pancakeSwapFactory,abi.panListening,provider);
const web3 = new Web3(new Web3.providers.HttpProvider(url.bscSeed1));
let control ={
    botMode:2, //0-stop, 1-available to buy, 2-buy all tokens
    enableMiniAudit: true, // enable mini audit feature: scanning tokens to check if it has potential features that make it a scam / honeypot / rugpull etc
    checkSourceCode: false, // check contract source code
    checkPancakeV1Router: false, // check if pancakeswap v1 router is used or not
    checkValidPancakeV2: false, // check if pancakeswap v2 router is used or not
    checkMintFunction: false, //check if any mint function enabled
    checkHoneypot: false, //check if token is honeypot

    transactionRevertTime:10000,
    gasLimit:3000000,
    amountToSpendPerSnipe:"0.00025", //BNB
    gasPrice:5000000000,
} 

let tokensArr = [];
const style = {BLACK : '\033[30m',RED : '\033[31m',GREEN : '\033[32m',YELLOW : '\033[33m',BLUE : '\033[34m',MAGENTA : '\033[35m',CYAN : '\033[36m',WHITE : '\033[37m',UNDERLINE : '\033[4m',RESET : '\033[0m',}
//###################### init of bot
//#####################################################
showFirstInitStyle();
//###################### get list of tokens
//#####################################################
factory.on("PairCreated", async (token0, token1, addressPair) => 
    {
        if(true||token1 == address.wbnb && control.botMode != 0){// we check if pair is WBNB, if not then ignore it
            const token0Contract = new web3.eth.Contract(abi.tokenNameABI,token0);
            const token1Contract = new web3.eth.Contract(abi.tokenNameABI,token1);
            const token0Name = await token0Contract.methods.name().call();
            const token0Symbol = await token0Contract.methods.symbol().call();
            const token1Name = await token1Contract.methods.name().call();
            const token1Symbol = await token1Contract.methods.symbol().call();
            showConsoleTokenDetected(token0,token0Name,token0Symbol,token1,token1Name,token1Symbol,addressPair);
            //__________________________mini audit feature____________________________
            if(control.botMode == 2 || control.botMode == 1 && tokensArr.indexOf(token0)!=-1){//check if control mode is allowed to buy or not.
                //--------------------------------------------Stage of audit-------------------------------------------------------
                if(control.enableMiniAudit){ // scans for potential features that make it a scam / honeypot/ rugpull ...
                    console.log(style.YELLOW + "Running mini audit..");
                    const contractCodeGetRequestURL = "https://api.bscscan.com/api?module=contract&action=getsourcecode&address=" + token0 + "&apikey=" + bscScanKey;
                    const contractCodeRequest = await axios.get(contractCodeGetRequestURL);
        
                    if(control.checkSourceCode && contractCodeRequest['data']['result'][0]['ABI'] == "Contract source code not verified") // check if source code is verified or not
                        console.log(style.RED + "[FAIL] Contract source code isn't verified.")
                    else if(control.checkPancakeV1Router && String(contractCodeRequest['data']['result'][0]['SourceCode']).indexOf('0x05fF2B0DB69458A0750badebc4f9e13aDd608C7F')!=-1) // check if pancake swap v1 router is used
                        console.log(style.RED + "[FAIL] Contract uses PancakeSwap v1 router.")    
                    else if(control.checkValidPancakeV2 && String(contractCodeRequest['data']['result'][0]['SourceCode']).indexOf(address.pancakeSwapRouter)==-1) // check if pancake swap v2 router is used
                        console.log(style.RED + "[FAIL] Contract does not use valid PancakeSwap v2 router.")      
                    else if(control.checkMintFunction && String(contractCodeRequest['data']['result'][0]['SourceCode']).indexOf('mint')!=-1) // check if any mint function enabled
                        console.log(style.RED + "[FAIL] Contract has mint function enabled.")      
                    else if(control.checkHoneypot && (String(contractCodeRequest['data']['result'][0]['SourceCode']).indexOf('function transferFrom(address sender, address recipient, uint256 amount) public override returns (bool)')!=-1 || String(contractCodeRequest['data']['result'][0]['SourceCode']).indexOf('function _approve(address owner, address spender, uint256 amount) internal')!=-1 || String(contractCodeRequest['data']['result'][0]['SourceCode']).indexOf('newun')!=-1)) // check if token is honeypot
                        console.log(style.RED + "[FAIL] Contract is a honey pot.")   
                    else{//we have passed audit
                        console.log(style.GREEN + "[SUCCESS] Token has passed mini audit.")
                        buy(token0,token0Symbol);
                    }     
                }
            }
        }
    }
    
)
//###################### buy token
//#####################################################
let buy = async (tokenAddress,tokenSymbol)=>{
    if(tokenAddress){
        console.log(style.MAGENTA+`----------> buying ${tokenAddress} (${tokenSymbol}) <-----------`)
        const tokenToBuy = web3.utils.toChecksumAddress(tokenAddress);
        const spend = web3.utils.toChecksumAddress(address.wbnb)//wbnb contract address
        const contract = new web3.eth.Contract(abi.pancake,address.pancakeSwapRouter);
        const nonce = await web3.eth.getTransactionCount(walletAddress);
        const tx = await contract.methods.swapExactETHForTokens(
            0, //Set to 0 or specify min number of tokens - setting to 0 just buys X amount of token at its current price for whatever BNB specified
            [spend,tokenToBuy],
            walletAddress,
            (Date.now() + control.transactionRevertTime*1000),
         
        );
        const rawTransaction = {
            "from":walletAddress,
            "gasPrice":web3.utils.toHex(control.gasPrice),
            "gasLimit":web3.utils.toHex(control.gasLimit),
            "to":address.pancakeSwapRouter,
            "value":web3.utils.toHex(web3.utils.toWei(control.amountToSpendPerSnipe, 'ether')), //This is the Token(BNB) amount you want to Swap from
            "data":tx.encodeABI(),
            "nonce":web3.utils.toHex(nonce),
            "chainID": ChainId.MAINNET,
        };
        const transaction = new Tx(rawTransaction);
        await transaction.sign(Buffer.from(privateKey, 'hex'));
        try{
            const result = await web3.eth.sendSignedTransaction('0x' + transaction.serialize().toString('hex'));
            console.log(style.YELLOW + 'Transaction sent and hash is' + result);
        }catch(error){
            console.log('Transaction error');
            console.log(error)
        }
       
    }
}

function showFirstInitStyle(){
    console.log(style.MAGENTA)
    console.log(" ███████╗███╗   ██╗██╗██████╗ ███████╗██████╗ ")
    console.log(" ██╔════╝████╗  ██║██║██╔══██╗██╔════╝██╔══██╗")
    console.log(" ███████╗██╔██╗ ██║██║██████╔╝█████╗  ██████╔╝")
    console.log(" ╚════██║██║╚██╗██║██║██╔═══╝ ██╔══╝  ██╔══██╗")
    console.log(" ███████║██║ ╚████║██║██║     ███████╗██║  ██║")
    console.log(" ╚══════╝╚═╝  ╚═══╝╚═╝╚═╝     ╚══════╝╚═╝  ╚═╝")
    console.log(style.GREEN);
    console.log('~~~~~~~~~~~~~~~~~~Collecting pair created~~~~~~~~~~~~~~~~~~')
}
function showConsoleTokenDetected(token0,token0Name,token0Symbol,token1,token1Name,token1Symbol,addressPair){
    console.log(style.YELLOW)
    console.log(`
    ~~~~~~~~~~~~~~~~~~ ${control.botMode==1?'Buy mode':control.botMode==2?'all buy mode':'shit'} ~~~~~~~~~~~~~~~~
    Token detected _ snipper tokens _ [${tokensArr.join(',')}]
    ~~~~~~~~~~~~~~~~~~ ${core_func.strftime(Date.now())} ~~~~~~~~~~~~~~~
    token0: ${token0} tokenName:${token0Name} tokenSymbol:${token0Symbol}
    token1: ${token1} tokenName:${token1Name} tokenSymbol:${token1Symbol}
    addressPair: ${addressPair}`);
}
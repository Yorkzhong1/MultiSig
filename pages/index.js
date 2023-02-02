import { ethers, BigNumber, Contract,providers, utils } from "ethers";
import Head from "next/head";
import React, { useEffect, useRef, useState } from "react";
import Web3Modal from "web3modal";
import {
  MultiSig_CONTRACT_ABI,
  MultiSig_CONTRACT_Code,
  Mapping_CONTRACT_ADDRESS,
  Mapping_CONTRACT_ABI,
} from "../constants";
import styles from "../styles/Home.module.css";
// import Layout from './layout'

import { useRouter } from 'next/router'
import { unstable_renderSubtreeIntoContainer } from "react-dom";



export default function Home() {

  
  const [walletConnected, setWalletConnected] = useState(false);
  const [owners,setOwners]=useState([]);
  const [loading, setLoading] = useState(false);
  const web3ModalRef = useRef();
  const [contractAdd,setContractAdd]=useState();
  const [require,setRequire]=useState();

  const [isOwner,setIsOwner] = useState(false);
  const [tx,setTx] = useState([])
  const [txCount,setTxCount] = useState(0)
  const [changes,setChanges]=useState(0)
  



  const getProviderOrSigner = async (needSigner = false) => {
    // Connect to Metamask
    // Since we store `web3Modal` as a reference, we need to access the `current` value to get access to the underlying object
    const provider = await web3ModalRef.current.connect();
    const web3Provider = new providers.Web3Provider(provider);

    // If user is not connected to the Goerli network, let them know and throw an error
    const { chainId } = await web3Provider.getNetwork();
    if (chainId !== 1337) {
      window.alert("Change the network to Goerli");
      throw new Error("Change network to Goerli");
    }

    if (needSigner) {
      const signer = web3Provider.getSigner();
      return signer;
    }
    return web3Provider;
  };

  const connectWallet = async () => {
    try {
      // Get the provider from web3Modal, which in our case is MetaMask
      // When used for the first time, it prompts the user to connect their wallet
      await getProviderOrSigner();
      setWalletConnected(true);
    } catch (err) {
      console.error(err);
    }
  };

  // useEffects are used to react to changes in state of the website
  // The array at the end of function call represents what state changes will trigger this effect
  // In this case, whenever the value of `walletConnected` changes - this effect will be called
  useEffect(() => {
    // if wallet is not connected, create a new instance of Web3Modal and connect the MetaMask wallet
    if (!walletConnected) {
      // Assign the Web3Modal class to the reference object by setting it's `current` value
      // The `current` value is persisted throughout as long as this page is open
      web3ModalRef.current = new Web3Modal({
        network: "goerli",
        providerOptions: {},
        disableInjectedProvider: false,
      });
      connectWallet();
      getContract()
      
    }
  }, []);

 

//functions to deploy contract
  async function addOwner() {
      try {

        let newowner = document.getElementById('ownerWallet').value;
        let reg = /^0x[a-fA-F0-9]{40}$/;
        let repeat = owners.indexOf(newowner) > -1;
        if (reg.test(newowner) && !repeat) {
          setOwners([...owners, newowner]);
        } else {
          alert('incorrect address format or repeat address');
        }
        document.getElementById('ownerWallet').value = "";
        document.getElementById('ownerWallet').placeholder = "0x...";
      } catch (err) {
        console.error(err);
      }
    }

  const deployMiltiSig = async () => {
    try {
      let required=document.getElementById('required').value
      if(required>owners.length){
        alert("required number of signer larger than number of owners")
      }
      const signer = await getProviderOrSigner(true);
      const multiSig = new ethers.ContractFactory(MultiSig_CONTRACT_ABI,MultiSig_CONTRACT_Code,signer);
      const contract = await multiSig.deploy(owners,required,Mapping_CONTRACT_ADDRESS);
      console.log(contract.address)
      await contract.deployed();
      
      getContract()
      
    } catch (err) {
      console.error(err);
    }
  };


const changeOwner = async () => {
  try {
    const provider = await getProviderOrSigner();
    const signer = await getProviderOrSigner(true);
    const address = await signer.getAddress();
    const multiSigContract = new Contract(
      contractAdd,
      MultiSig_CONTRACT_ABI,
      signer
    );
    const newowner=document.getElementById('newowner').value;
    await multiSigContract.changeOwner(newowner);


  } catch (err) {
    console.error(err);
  }
};

 ////functions to add transactions contract
 const getContract = async () => {
  try {
    const provider = await getProviderOrSigner();
    const mappingContract = new Contract(
      Mapping_CONTRACT_ADDRESS,
      Mapping_CONTRACT_ABI,
      provider
    );

    const signer = await getProviderOrSigner(true);
    const address = await signer.getAddress();
    const contracts = await mappingContract.checkContracts();
    console.log(contracts)
    
    //loop through all contracts address, and if the wallet is owner of the contract, then set Contract Address
    contracts.forEach(async (add)=>{
      let multiSigContract = new Contract(
        add,
        MultiSig_CONTRACT_ABI,
        provider
      );
      const req = await multiSigContract.isOwner(address)
      if(req){  //if the multisig contract contains wallet address as owner, then...
        console.log('find match')
        const owners = await multiSigContract.getOwners();
        const req = await multiSigContract.required();
        setContractAdd(add)
        setRequire(req.toNumber())
        setOwners(owners)
        setIsOwner(true)
      }  
    })
    


  } catch (err) {
    console.error(err);
  }
};

const submitTransaction = async () => {
  try {
    const provider = await getProviderOrSigner();
    const multiSigContract = new Contract(
      contractAdd,
      MultiSig_CONTRACT_ABI,
      provider
    );

    const signer = await getProviderOrSigner(true);
    const address = await signer.getAddress();
    let _to=document.getElementById('to').value;
    let _value=ethers.utils.parseUnits(document.getElementById('value').value,"ether")
    let _data=document.getElementById('data').value;
    const check = await multiSigContract.connect(signer).submitTransaction(_to,_value,_data)
    // setChanges(changes+1);
    check.wait()
    getTransaction()

  } catch (err) {
    console.error(err);
  }
};

//functions for operating existing transactions

const getTransaction = async () => {
  try {
    const provider = await getProviderOrSigner();
    
    const multiSigContract = new Contract(
      contractAdd,
      MultiSig_CONTRACT_ABI,
      provider
    );
    const signer = await getProviderOrSigner(true);
    const address = await signer.getAddress();
    const txCount = await multiSigContract.transactionCount()
    
    setTxCount(txCount)
    
    
    let display=`<div> <h4>total transactions: ${txCount}</h4>`
    for(let i=0;i<txCount.toNumber();i++){
      const tx = await multiSigContract.transactions(i)
      
      
      
      
      
      const myConfirm = await multiSigContract.confirmations(i,address)
      
      display+=`
      <div>
      Transaction ${i}
      <ul>
      <li>To:${tx[0]}</li>
      <li>Value:${tx[1]}</li>
      <li>Tx Status:${tx[2]==0?"<b>NOT APPROVED</b>":(tx[2]==1?"<b>APPROVED</b>":"<b>EXECUTED</b>")}</li>
      <li>Confirmed:${tx[3]}</li>
      <li>Data:${tx[4]}</li>
      <li>MyConfirmation:${myConfirm}</li>
      <div class=${styles.divider}></div>
      </ul></div>`
      
    }
    display+=`</div>`
    document.getElementById('tx').innerHTML=display
    
  } catch (err) {
    console.error(err);
  }
};

const confirmTransaction = async () => {
  try {
    
    const provider = await getProviderOrSigner();
    const multiSigContract = new Contract(
      contractAdd,
      MultiSig_CONTRACT_ABI,
      provider
    );

    const signer = await getProviderOrSigner(true);
    const address = await signer.getAddress();
    let txId=document.getElementById('txId').value;
    // let _value=ethers.utils.parseUnits(document.getElementById('value').value,"ether")
    // let _data=document.getElementById('data').value;
    
    const confirmCount = await multiSigContract.getConfirmationsCount(txId)
    console.log('waiting to confirm transaction...')
    const confirm=await multiSigContract.connect(signer).confirmTransaction(txId)
    console.log('transaction confirmed...')
    // const confirm = await multiSigContract.connect(signer).getConfirm(0)
    // const check =   await multiSigContract.connect(signer).confirmTransaction(2)
    // confirm.wait()
    // getTransaction()
    
      
    
  } catch (err) {
    console.error(err);
  }
};



const execut = async () => {
  try {
    
    const provider = await getProviderOrSigner();
    const multiSigContract = new Contract(
      contractAdd,
      MultiSig_CONTRACT_ABI,
      provider
    );

    const signer = await getProviderOrSigner(true);
    const address = await signer.getAddress();
    let txId=document.getElementById('txId').value;
    const exe2 = await multiSigContract.connect(signer).executeTransaction(txId)
  
    
    ;  
    
  } catch (err) {
    console.error(err);
  }
};



  return (
    <div>
      <Head>
        <title>Family Funds</title>
        <meta name="description" content="Fund-Dapp" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div class={styles.header}>
        <h1> Children Fund</h1>
        <div className={styles.description}>
            Manage your children's future
            

          </div>
      </div>
     
      <div className={styles.main}>
        
        <div className={styles.block}>
          <h1 className={styles.title}>Deploy multi-sig wallet</h1>
          <div className={styles.description}>
            You can deploy your family fund MultiSig wallet here
          </div>
          {walletConnected ? (
            <div>
              <div>
                <input className={styles.input} placeholder="0x..." id="ownerWallet"></input>
              <button className={styles.button2} onClick={addOwner}>Add owner</button>
              </div>
              <div>
                  <select className={styles.select} id="required">
                    <option value=""># of signers--</option>
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                    <option value="5">5</option>
                    <option value="6">6</option>
                    <option value="7">7</option>
                    <option value="8">8</option>
                    <option value="9">9</option>
                  </select>
                  
                  <button className={styles.button2} onClick={deployMiltiSig}>Deploy multiSig contract</button>
                  
              </div>
              
              <div>
                Current Owners {owners.length}:
                <ul>
                {owners.map((owner)=>{
                  return(<li>{owner}</li>)
                })}
                </ul>
              </div>
              <div className={styles.divider} >newOwner:<input className={styles.input} id="newowner"></input>
              <button className={styles.button2} onClick={changeOwner}>Change Owner</button></div>
            </div>

          ) : (
            <button onClick={connectWallet} className={styles.button}>
              Connect your wallet
            </button>
          )}

         


        </div>

        <div className={styles.block}>
        <h1 className={styles.title}>My MultiSig Wallet</h1>
          <div className={styles.description}>
          <div>
            {isOwner?(<div>
              <div><b>Contract address: </b>{contractAdd}</div>
              
              <div>
                <b>Current Owners:{owners.length}</b>
                <ul>
                {owners.map((owner)=>{
                  return(<li>{owner}</li>)
                })}
                </ul>
                <b>Required approvers:{require}</b>
              </div>
              
              <div className={styles.divider} >To :<input className={styles.input} id="to"></input></div>
              <div>Value: <input className={styles.input} id="value"></input></div>
              <div>Data: <input className={styles.input} id="data"></input></div>
              <button className={styles.button2} onClick={submitTransaction} >Submit Transaction</button>
            </div>

            ):(<div>
              <h3 >You are not a owner</h3>
            </div>)}

          </div>
            

          </div>
        </div>

        <div className={styles.block}>
        <h1 className={styles.title}>Approve and execute Transaction</h1>
          <div className={styles.description}>
          <div>
            {isOwner?(<div>
              <div>your contract address: {contractAdd}</div>
              <button className={styles.button2} onClick={getTransaction}>Get Transaction</button>
              <div className={styles.divider} ></div>
              
              <div>
                <input className={styles.input2} id="txId" placeholder="TxId"></input>
                <button className={styles.button2} onClick={confirmTransaction}>Confirm Transaction</button>
                <button className={styles.button2} onClick={execut}>Execute Transaction</button>
              </div>
              
              
              <div id="tx"></div>
              
              

            </div>

            ):(<div>
              <h3 >You are not a owner</h3>
            </div>)}

          </div>
            

          </div>
        </div>
      
      </div>

      <footer className={styles.footer}>
        Made with &#10084; by Family Funds
      </footer>
    </div>
  );
}
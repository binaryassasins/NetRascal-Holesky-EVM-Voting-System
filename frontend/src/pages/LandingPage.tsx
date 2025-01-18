import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';
import { AnimatePresence, motion } from 'framer-motion';
// import VotingABI from '../../../artifacts/contracts/Vote.sol/Voting.json';
import VotingABI from "../config/VotingABI.json";
import logo from '../assets/NetRascal.svg';
import metamasklogo from '../assets/MetaMask_Fox.svg';
import { FaVoteYea } from 'react-icons/fa'; // Importing FaVoteYea icon from react-icons

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS;

const LandingPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [nationalId, setNationalId] = useState('');
  const [address, setAddress] = useState('');

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => { 
        setErrorMessage(''); 
      }, 3000); // Hide after 3 seconds
      return () => clearTimeout(timer); // Cleanup on component unmount
    }
  }, [errorMessage]);

  const handleMetaMaskLogin = async () => {
    if (!window.ethereum) {
      setErrorMessage('MetaMask is not installed. Please install MetaMask to continue.');
      return;
    }

    try {
      setLoading(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send('eth_requestAccounts', []);
      const walletAddress = accounts[0];

      if (!walletAddress) {
        setErrorMessage('No wallet address found.');
        return;
      }

      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, VotingABI.abi, signer);

      const adminAddress = await contract.admin();
      const isAdmin = walletAddress.toLowerCase() === adminAddress.toLowerCase();

      const voter = await contract.voters(walletAddress);

      if (isAdmin) {
        navigate('/admin', { state: { walletAddress } });
      } else if (voter.isRegistered) {
        navigate('/voter', { state: { walletAddress } });
      } else {
        setErrorMessage('Your wallet is not registered as a voter. Please contact an admin to register your wallet address.');
      }
    } catch (error) {
      console.error('MetaMask login failed:', error);
      setErrorMessage('MetaMask login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVoterLogin = async () => {
    try {
      setLoading(true);
  
      // Validate entered national ID and address
      if (!nationalId || !address) {
        setErrorMessage('Please enter both National ID and Voting Key.');
        setLoading(false);
        return;
      }
  
      // Initialize provider and contract
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, VotingABI.abi, provider);
  
      // Verifying the voter credentials by calling the verifyVoter function in the contract
      const isVoterVerified = await contract.verifyVoter(address, nationalId);
  
      if (isVoterVerified) {
        // If voter is verified, navigate to the voter page
        navigate('/voter', { state: { address } });
      } else {
        // If voter verification fails
        setErrorMessage('Invalid credentials. Please check your National ID and Address.');
      }
    } catch (error) {
      console.error('Voter login failed:', error);
      setErrorMessage('Voter login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };  

  return (
    <div className="relative h-screen flex flex-col justify-center items-center bg-gradient-to-b from-gray-50 to-blue-200 overflow-hidden">
      <motion.img
        src={logo}
        alt="NetRascal Logo"
        className="w-48 h-48 md:w-56 md:h-56 lg:w-64 lg:h-64"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
      />

      <motion.h1
        className="text-center font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-700 mb-10"
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 1, ease: 'easeOut', delay: 0.5 }}
      >
        <span className="block text-5xl sm:text-6xl md:text-7xl lg:text-8xl leading-tight">
          NetRascal
        </span>
        <span className="block text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-gray-800">
          E-Voting System
        </span>
      </motion.h1>

      <motion.p
        className="font-semibold text-xl text-center text-gray-800 mb-10 italic"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1 }}
      >
        "A secure and transparent platform for conducting elections"
      </motion.p>

      <div className="flex flex-col space-y-4 w-full max-w-xs">
        {/* Voter Login Button with Icon */}
        <motion.button
          onClick={() => setShowModal(true)}
          disabled={loading}
          className={`flex items-center justify-center w-full h-14 px-8 text-lg font-semibold text-white rounded-lg shadow-lg transition duration-300 ${
            loading ? 'bg-gray-500 cursor-not-allowed' : 'bg-gray-800 hover:bg-gray-600'
          }`}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.2, ease: 'easeOut', delay: 1.2 }}
          // whileHover={!loading ? { scale: 1.05, boxShadow: '0px 4px 15px rgba(0, 0, 0, 0.2)' } : {}}
          whileTap={!loading ? { scale: 0.95 } : {}}
        >
          <FaVoteYea className="w-10 h-10 mr-3" />  {/* Icon added here */}
          Login as Voter
        </motion.button>

        {/* MetaMask Login Button */}
        <motion.button
          onClick={handleMetaMaskLogin}
          disabled={loading}
          className={`flex items-center justify-center w-full h-14 px-8 text-lg font-semibold text-white rounded-lg shadow-lg transition duration-300 ${
            loading ? 'bg-gray-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
          }`}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.25, ease: 'easeOut', delay: 1.2 }}
          // whileHover={!loading ? { scale: 1.05, boxShadow: '0px 4px 15px rgba(0, 0, 0, 0.2)' } : {}}
          whileTap={!loading ? { scale: 0.95 } : {}}
        >
          <img
            src={metamasklogo}
            alt="MetaMask Logo"
            className="w-10 h-10 mr-3"
          />
          {loading ? 'Connecting...' : 'Login with MetaMask'}
        </motion.button>
      </div>

      <AnimatePresence>
        {errorMessage && (
          <motion.div
            className="absolute top-0 left-0 right-0 flex justify-center mt-8 z-20"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
          >
            <div className="bg-red-500 text-white p-4 rounded-lg shadow-lg max-w-4xl w-full text-center">
              <p>{errorMessage}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {showModal && (
        <div className="fixed inset-0 flex justify-center items-center bg-gray-800 bg-opacity-50 z-10">
          {/* Modal Container with Animation */}
          <motion.div
            className="bg-white p-8 rounded-2xl shadow-xl w-96 max-w-md"
            initial={{ opacity: 0, scale: 0.9 }} // Initial state: invisible and scaled down
            animate={{ opacity: 1, scale: 1 }}   // Final state: fully visible and normal size
            exit={{ opacity: 0, scale: 0.9 }}    // Exit state: fade out and scale down
            transition={{ duration: 0.3 }}       // Transition time
          >
            {/* Modal Title */}
            <h2 className="text-3xl text-center font-bold text-gray-800 mb-6">Voter Login</h2>

            {/* Input Fields */}
            <input
              type="text"
              placeholder="National ID (NRIC)"
              value={nationalId}
              onChange={(e) => setNationalId(e.target.value)}
              className="w-full mb-4 p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200 ease-in-out"
            />
            <input
              type="text"
              placeholder="Voting Key"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full mb-6 p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200 ease-in-out"
            />

            {/* Action Buttons */}
            <div className="flex space-x-4">
              <button
                onClick={handleVoterLogin}
                className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition duration-200"
              >
                Login
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="w-full py-3 bg-red-500 text-white font-semibold rounded-lg shadow-md hover:bg-red-600 transition duration-200"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;

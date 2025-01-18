import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
// import VotingABI from "../../../artifacts/contracts/Vote.sol/Voting.json";
import VotingABI from "../config/VotingABI.json";
import { useNavigate } from "react-router-dom";
import { BrowserProvider, Interface } from "ethers";
import logo from "../assets/NetRascal.svg";
import { AnimatePresence, motion } from "framer-motion";
import { FaSignOutAlt } from "react-icons/fa";

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS; // Replace with your deployed contract address
const abi = new Interface(VotingABI.abi);

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  // const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [votingStarted, setVotingStarted] = useState(false);
  const [votingEnded, setVotingEnded] = useState(false);
  const [newVoter, setNewVoter] = useState({
    name: "",
    nationalId: "",
    age: "",
    address: "",
  });
  const [newCandidate, setNewCandidate] = useState({
    name: "",
    partyName: "",
    address: "",
  });
  const [adminConsent, setAdminConsent] = useState(false); // State for consent checkbox
  const [electionResults, setElectionResults] = useState<any | null>(null); // For storing results

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => { 
        setErrorMessage(''); 
      }, 3000); // Hide after 3 seconds
      return () => clearTimeout(timer); // Cleanup on component unmount
    }
  }, [errorMessage]);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => { 
        setSuccessMessage(''); 
      }, 3000); // Hide after 3 seconds
      return () => clearTimeout(timer); // Cleanup on component unmount
    }
  }, [successMessage]);

  useEffect(() => {
    const initBlockchain = async () => {
      if (window.ethereum) {
        const web3Provider = new BrowserProvider(window.ethereum);
        // setProvider(web3Provider);
        const signer = await web3Provider.getSigner();
        const votingContract = new ethers.Contract(CONTRACT_ADDRESS, abi, signer);
        setContract(votingContract);

        // Fetch voting states on load
        const started = await votingContract.votingStarted();
        const ended = await votingContract.votingEnded();
        setVotingStarted(started);
        setVotingEnded(ended);
      } else {
        setErrorMessage("Please install a Web3 wallet like MetaMask!");
      }
    };

    initBlockchain();
  }, []);

  const fetchElectionResults = async (contract: ethers.Contract) => {
    try {
      const [winner, maxVotes, isTie] = await contract.getElectionResults();
      const tiedCandidates = isTie ? await contract.getTiedCandidates() : [];
      const results = { winner, maxVotes, isTie, tiedCandidates };
      setElectionResults(results);
    } catch (err) {
      console.error("Failed to fetch election results:", err);
      setErrorMessage("Could not fetch election results.");
    }
  };

  const handleToggleConsent = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAdminConsent(e.target.checked);
  };

  // Spinner Prop
  interface SpinnerProps {
    text: string;
    size?: number;
    speed?: "slow" | "medium" | "fast";
  }

  // Spinner Component
  const Spinner =({ text, size = 20, speed = "medium"} : SpinnerProps) => {
    const speedClass = {
      slow: "animate-spin-slow",
      medium: "animate-spin",
      fast: "animate-spin-fast",
    }[speed];
    
    return (
      <div className="flex items-center space-x-2">
        <div
          className={`border-4 border-t-4 border-solid rounded-full ${speedClass}`}
          style={{
            width: `${size}px`,
            height: `${size}px`,
          }}
        ></div>
        <span>{text}</span>
      </div>
    )
  };

  const handleRegisterVoter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contract) return;

    try {
      setLoading(true);
      const tx = await contract.registerVoter(
        newVoter.address,
        newVoter.name,
        newVoter.nationalId,
        parseInt(newVoter.age)
      );
      await tx.wait();
      setSuccessMessage(`Successfully registered voter: ${newVoter.name}`);
      setNewVoter({ name: "", nationalId: "", age: "", address: "" });
    } catch (err) {
      console.error(err);
      setErrorMessage("Failed to register voter.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contract) return;

    try {
      setLoading(true);
      const tx = await contract.registerCandidate(
        newCandidate.address,
        newCandidate.name,
        newCandidate.partyName
      );
      await tx.wait();
      setSuccessMessage(`Successfully registered candidate: ${newCandidate.name}`);
      setNewCandidate({ name: "", partyName: "", address: "" });
    } catch (err) {
      console.error(err);
      setErrorMessage("Failed to register candidate.");
    } finally {
      setLoading(false);
    }
  };

  const toggleVoting = async () => {
    console.log('Admin consent:', adminConsent);
    console.log('Voting started:', votingStarted);
    console.log('Voting ended:', votingEnded);
    if (!contract) return;
  
    try {
      setLoading(true);
      // Case 1: Voting hasn't started and hasn't ended
      if (!votingStarted && !votingEnded && adminConsent) {
        const tx = await contract.startVoting();
        await tx.wait();
  
        const started = await contract.votingStarted();
        const ended = await contract.votingEnded();
        setVotingStarted(started);
        setVotingEnded(ended);
  
        setSuccessMessage("Voting started.");
      }
      // Case 2: Voting has started but hasn't ended
      else if (votingStarted && !votingEnded) {
        if (adminConsent) {
          const tx = await contract.endVoting();
          await tx.wait();
  
          const started = await contract.votingStarted();
          const ended = await contract.votingEnded();
          setVotingStarted(started);
          setVotingEnded(ended);
  
          setSuccessMessage("Voting ended.");
        } else {
          setErrorMessage("Please agree to the terms before ending the voting.");
        }
      }
      // Case 3: Voting has ended but hasn't started (can restart voting)
      else if (!votingStarted && votingEnded && adminConsent) {
        const tx = await contract.startVoting();
        await tx.wait();
  
        const started = await contract.votingStarted();
        const ended = await contract.votingEnded();
        setVotingStarted(started);
        setVotingEnded(ended);
  
        setSuccessMessage("Voting started.");
      }
      // If none of the conditions are met
      else {
        setErrorMessage("Please agree to the terms before starting the voting.");
      }
    } catch (err) {
      console.error(err);
      setErrorMessage("Failed to toggle voting status.");
    } finally {
      setLoading(false);
    }
  };      

  const handleLogout = () => {
    navigate("/");
  };

  return (
    <div className="bg-gray-50 h-full">
      <AnimatePresence>
        {errorMessage && (
          <motion.div
            className="fixed top-0 left-0 right-0 flex justify-center mt-8 z-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="bg-red-500 text-white p-4 rounded-lg shadow-lg max-w-4xl w-full text-center">
              <p>{errorMessage}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {successMessage && (
          <motion.div
            className="fixed top-0 left-0 right-0 flex justify-center mt-8 z-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="bg-green-500 text-white p-4 rounded-lg shadow-lg max-w-4xl w-full text-center">
              <p>{successMessage}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="bg-gray-900 text-white p-4 shadow-md sticky top-0 z-0">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <motion.img
            src={logo}
            alt="NetRascal Logo"
            className="w-12 h-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          />
          <motion.h1
            className="text-3xl font-bold"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            Admin Dashboard
          </motion.h1>
          <motion.button
            onClick={handleLogout}
            className="bg-red-500 text-white py-2 px-6 rounded-lg hover:bg-red-600 hidden md:block"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            Logout
          </motion.button>
          <motion.button
            onClick={handleLogout}
            className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 block md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <FaSignOutAlt className="w-6 h-6"/>
          </motion.button>
        </div>
      </header>

      <motion.div
        className="max-w-7xl mx-auto p-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div className="bg-white shadow-lg rounded-xl p-6 flex flex-col">
          <motion.h2 className="text-2xl font-semibold mb-4">Register Voter</motion.h2>
          <form onSubmit={handleRegisterVoter}>
            <input
              type="text"
              placeholder="Voter Name"
              value={newVoter.name}
              onChange={(e) => setNewVoter({ ...newVoter, name: e.target.value })}
              className="w-full px-4 py-3 border rounded-lg mb-4"
            />
            <input
              type="text"
              placeholder="National ID"
              value={newVoter.nationalId}
              onChange={(e) => setNewVoter({ ...newVoter, nationalId: e.target.value })}
              className="w-full px-4 py-3 border rounded-lg mb-4"
            />
            <input
              type="text"
              placeholder="Age"
              value={newVoter.age}
              onChange={(e) => setNewVoter({ ...newVoter, age: e.target.value })}
              className="w-full px-4 py-3 border rounded-lg mb-4"
            />
            <input
              type="text"
              placeholder="Address"
              value={newVoter.address}
              onChange={(e) => setNewVoter({ ...newVoter, address: e.target.value })}
              className="w-full px-4 py-3 border rounded-lg mb-4"
            />
            <motion.button
              type="submit"
              className={`w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 ${
                loading ? "cursor-not-allowed opacity-50" : ""}`}
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <Spinner text="Registering Voter..."/>
                </div>
              ) : "Register Voter"}
            </motion.button>
          </form>
        </motion.div>

        <motion.div className="bg-white shadow-lg rounded-xl p-6 flex flex-col">
          <motion.h2 className="text-2xl font-semibold mb-4">Register Candidate</motion.h2>
          <form onSubmit={handleRegisterCandidate}>
            <input
              type="text"
              placeholder="Candidate Name"
              value={newCandidate.name}
              onChange={(e) => setNewCandidate({ ...newCandidate, name: e.target.value })}
              className="w-full px-4 py-3 border rounded-lg mb-4"
            />
            <input
              type="text"
              placeholder="Party Name"
              value={newCandidate.partyName}
              onChange={(e) => setNewCandidate({ ...newCandidate, partyName: e.target.value })}
              className="w-full px-4 py-3 border rounded-lg mb-4"
            />
            <input
              type="text"
              placeholder="Address"
              value={newCandidate.address}
              onChange={(e) => setNewCandidate({ ...newCandidate, address: e.target.value })}
              className="w-full px-4 py-3 border rounded-lg mb-4"
            />
            <motion.button
              type="submit"
              className={`w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 ${
                loading ? "cursor-not-allowed opacity-50" : ""}`}
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  {/* <div className="animate-spin border-4 border-t-4 border-blue-300 border-solid rounded-full h-5 w-5"></div> */}
                  <Spinner text="Registering Candidate..."/>
                </div>
              ) : "Register Candidate"}
            </motion.button>
          </form>
        </motion.div>

        {/* Voting Control Section */}
        <motion.div className="bg-white shadow-lg rounded-xl p-6 flex flex-col">
          <motion.h2 className="text-2xl font-semibold mb-4">Voting Control</motion.h2>

          {/* Consent Section */}
          <div className="mb-6">
            <p className="text-sm text-gray-700 mb-4">
              Before starting the voting process, please read and agree to the terms and conditions.
            </p>
            <textarea
  className="w-full h-40 px-6 py-2 border-2 rounded-lg mb-4"
  readOnly
  value={`By selecting this box, you acknowledge and agree to the following conditions:
1. You are authorized as the administrator of the voting system.
2. You understand the importance of initiating and managing the voting process.
3. You accept full responsibility for ensuring the fairness, transparency, and integrity of the voting procedure.
4. You consent to the terms of the voting process, including the start, management, and conclusion of the election.
5. You acknowledge that once voting is started, it cannot be reversed or altered without proper authorization and compliance with the rules.

Please review these terms carefully before proceeding to start the voting process.`}
            />

            <div className="flex items-center">
              <input
                type="checkbox"
                checked={adminConsent}
                onChange={handleToggleConsent}
                className="mr-2"
              />
              <label className="text-sm text-gray-600">I agree to the terms and conditions</label>
            </div>
          </div>

          {/* Voting Button */}
          <motion.button
            onClick={toggleVoting}
            className={`w-full py-3 text-white rounded-lg ${
              votingStarted && !votingEnded ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"
            } ${!adminConsent || loading ? "cursor-not-allowed opacity-50" : ""}`}
            disabled={!adminConsent || loading} // Disable button if consent is not checked
          >
            {loading ? (
              <div className="flex items-center justify-center space-x-2">
                <Spinner text="Processing..."/>
              </div>
            ) : votingStarted && !votingEnded ? (
              "End Voting"
            ) : (
              "Start Voting"
            )}
          </motion.button>
        </motion.div>
        {/* Election Results Section */}
        <motion.div className="bg-white shadow-lg rounded-xl p-6 flex flex-col">
          <motion.h2 className="text-2xl font-semibold mb-4">Election Results</motion.h2>
          
          {votingEnded ? (
            <div>
              {electionResults ? (
                <div>
                  {electionResults.isTie ? (
                    <p className="font-medium">There is no winner due to a tie!</p>
                  ) : (
                    <div>
                      <p className="font-medium">Winner: {electionResults.winner}</p>
                      <p className="font-medium">Votes: {electionResults.maxVotes}</p>
                    </div>
                  )}
                  
                  {electionResults.isTie && (
                    <div>
                      <p className="mt-4 text-gray-600">The following candidates are tied:</p>
                      <ul className="list-disc pl-5 mt-2">
                        {electionResults.tiedCandidates.map((candidate: any) => (
                          <li key={candidate.candidateAddress}>
                            {candidate.name} ({candidate.partyName})
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-600">Click on the button below to view the results.</p>
              )}
            </div>
          ) : (
            <p className="text-gray-600">Voting has not yet ended. Results will be available once voting concludes.</p>
          )}

          <motion.button
            onClick={() => {
              contract && fetchElectionResults(contract);
            }}
            className="mt-4 bg-blue-600 text-white py-2 px-6 rounded-lg hover:bg-blue-700"
            disabled={loading || !votingEnded}
          >
            {loading ? (
              <div className="flex items-center justify-center space-x-2">
                <Spinner text="Loading results..." />
              </div>
            ) : (
              "Fetch Election Results"
            )}
          </motion.button>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default AdminDashboard;
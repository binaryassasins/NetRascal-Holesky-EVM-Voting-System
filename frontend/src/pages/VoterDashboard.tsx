import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ethers } from 'ethers';
// import VotingABI from "../../../artifacts/contracts/Vote.sol/Voting.json";
import VotingABI from "../config/VotingABI.json";
import { BrowserProvider, Interface } from "ethers";
import logo from '../assets/NetRascal.svg';
import { motion } from 'framer-motion';

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS; // Replace with your deployed contract address
const abi = new Interface(VotingABI.abi);

const VoterDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  // const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [hasVoted, setHasVoted] = useState(false); // Track voting status
  const [voterName, setVoterName] = useState<string>(""); // Voter's name from the contract
  const [votingStarted, setVotingStarted] = useState(false); // Track if voting has started
  const [votingEnded, setVotingEnded] = useState(false); // Track if voting has ended
  const [loading, setLoading] = useState(true); // Loading state while fetching data
  const [candidates, setCandidates] = useState<{ name: string; address: string }[]>([]); // List of candidates
  const [isModalOpen, setIsModalOpen] = useState(false); // Modal visibility
  const [selectedCandidate, setSelectedCandidate] = useState<string>(""); // Selected candidate
  const [votedCandidate, setVotedCandidate] = useState<{ 
    name: string, 
    partyName: string 
  }>({
    name: '',
    partyName: ''
  });
  const [electionResult, setElectionResult] = useState<{
    winner: string;
    maxVotes: number;
    isTie: boolean;
  }>({
    winner: '',
    maxVotes: 0,
    isTie: false
  });
  const [winnerDetails, setWinnerDetails] = useState<{ 
    name: string, 
    partyName: string 
  }>({
    name: '',
    partyName: ''
  });
  const [tiedCandidates, setTiedCandidates] = useState<{ 
    name: string, 
    partyName: string, 
    votes: number 
  }[]>([]);

  useEffect(() => {
    const initBlockchain = async () => {
      let address = "";

      // Try to get address from navigation state
      const navigationState = location.state as { address: string };
      address = navigationState?.address;

      // If no address from navigation state, use MetaMask to fetch address
      if (!address && window.ethereum) {
        try {
          const web3Provider = new BrowserProvider(window.ethereum);
          // setProvider(web3Provider);
          const signer = await web3Provider.getSigner();
          address = await signer.getAddress();
        } catch (err) {
          console.error("Error fetching MetaMask address", err);
          alert("Please connect your MetaMask wallet!");
          navigate('/');
          return;
        }
      }

      if (!address) {
        console.error("No wallet address found");
        navigate('/');
        return;
      }

      try {
        const web3Provider = new BrowserProvider(window.ethereum);
        // setProvider(web3Provider);

        const signer = await web3Provider.getSigner();
        const votingContract = new ethers.Contract(CONTRACT_ADDRESS, abi, signer);
        setContract(votingContract);

        // Fetch voter details from the contract
        const voterDetails = await votingContract.voters(address);
        setVoterName(voterDetails.name);
        setHasVoted(voterDetails.hasVoted);

        // Fetch the voted candidate details if voter has voted
        if (voterDetails.hasVoted) {
          const votedFor = voterDetails.votedFor;
          const candidate = await votingContract.candidates(votedFor); // Get candidate details from contract
          setVotedCandidate({
            name: candidate.name,
            partyName: candidate.partyName
          });
        }

        // Check if voting has started and ended
        const votingHasStarted = await votingContract.votingStarted();
        const votingHasEnded = await votingContract.votingEnded();
        setVotingStarted(votingHasStarted);
        setVotingEnded(votingHasEnded);

        // Fetch the list of candidates
        const candidateList = await votingContract.getAllCandidates(); // Assuming `getCandidates` function exists in your contract
        const candidatesWithDetails = await Promise.all(
          candidateList.map(async (candidateData: any) => {
            // Access the properties using the indices of the Proxy(_Result) object
            const name = candidateData[0]; // Name of the candidate (index 0)
            const address = candidateData[1]; // Candidate's address (index 1)
            const votes = candidateData[2]; // Votes (index 2)
            const partyName = candidateData[3]; // Party name (index 3)
            return {
              name,
              address,
              votes,
              partyName,
            };
          })
        );
        setCandidates(candidatesWithDetails);

        // Fetch the election results if voting has ended
        if (votingEnded) {
          const result = await votingContract.getElectionResults();
          
          const winnerAddress = result.winner;
          setElectionResult({
            winner: winnerAddress,
            maxVotes: parseInt(result.maxVotes),
            isTie: result.isTie
          });

          if (result.isTie) {
            const tiedCandidatesDetails = await votingContract.getTiedCandidates();
            const formattedTiedCandidates = tiedCandidatesDetails.map((candidate: any) => ({
              name: candidate.name,
              partyName: candidate.partyName,
              votes: parseInt(candidate.voteCount),
            }));
            // console.log(formattedTiedCandidates);
            setTiedCandidates(formattedTiedCandidates);
          } else {
            // Fetch the winner's details (name and party) using the winner address
            if (winnerAddress !== '0x0000000000000000000000000000000000000000') {
              const winnerCandidate = await votingContract.candidates(winnerAddress);
              setWinnerDetails({
                name: winnerCandidate.name,
                partyName: winnerCandidate.partyName
              });
            }
          }
        }
        
      } catch (err) {
        console.error("Error fetching voter details:", err);
      }
      setLoading(false);
    };

    initBlockchain();
  }, [navigate, location.state, votingEnded, votedCandidate]);

  const handleVote = async () => {
    if (!contract || !selectedCandidate) return;

    try {
      const tx = await contract.vote(selectedCandidate); // Pass selected candidate's address
      await tx.wait();
      setHasVoted(true);
      setIsModalOpen(false); // Close the modal after voting
    } catch (err) {
      console.error(err);
      alert("Failed to cast vote.");
    }
  };

  const handleLogout = () => {
    navigate('/');
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center">
          <svg className="animate-spin h-12 w-12 text-blue-600 mb-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle className="opacity-25" cx="12" cy="12" r="10" strokeWidth="4"></circle>
            <path className="opacity-75" fill="none" d="M4 12a8 8 0 0116 0"></path>
          </svg>
          <p className="text-lg text-gray-600">Loading, please wait...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-50">
      {/* Navigation Bar */}
      <header className="bg-gray-900 text-white p-4 shadow-md sticky top-0 z-0">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <img 
            src={logo}
            alt="NetRascal Logo"
            className="w-12 h-12"
          />
          <h1 className="text-3xl font-bold tracking-tight">Voter Dashboard</h1>
          <button 
            onClick={handleLogout}
            className="bg-red-500 text-white py-2 px-6 rounded-lg hover:bg-red-600 focus:outline-none transition-colors"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Dashboard Content */}
      <motion.div
        className="max-w-5xl mx-auto p-4 sm:p-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* User Info Section */}
        <motion.div
          className="mb-4 p-4 sm:p-6 bg-white rounded-lg shadow-sm text-center"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-2xl sm:text-3xl font-semibold text-gray-800">
            Welcome, {voterName || "Loading..."}
          </h2>
          <p className="text-gray-600 mt-2 text-sm sm:text-base">
            You are eligible to participate in the upcoming election.
          </p>
        </motion.div>

        {/* Dashboard Actions (Rearranged for compact display) */}
        <motion.div
          className="mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4 sm:gap-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          {/* Vote Now Option */}
          <motion.div
            className="bg-white p-4 sm:p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow flex flex-col items-center"
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.3 }}
          >
            <h3 className="text-lg sm:text-2xl font-semibold text-gray-800 mb-2 sm:mb-4">Vote Now</h3>
            <p className="text-sm sm:text-base text-gray-600 mb-4 text-center">
              Cast your vote in the upcoming election.
            </p>
            <button
              className={`w-full py-2 sm:py-3 text-sm sm:text-lg font-semibold text-white rounded-md transition-colors focus:outline-none ${
                !votingStarted || hasVoted || votingEnded
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500"
              }`}
              onClick={() => setIsModalOpen(true)} // Open the modal when clicked
              disabled={hasVoted || !votingStarted || votingEnded}
            >
              {hasVoted
                ? "Voted"
                : votingStarted
                ? votingEnded
                  ? "Voting Ended"
                  : "Vote Now"
                : "Voting Not Started"}
            </button>
          </motion.div>

          {/* Voting Status Section */}
          <motion.div
            className="p-4 sm:p-6 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow flex flex-col items-center"
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.5 }}
          >
            <h3 className="text-lg sm:text-2xl font-semibold text-gray-800 mb-2 sm:mb-4">Voting Status</h3>
            <p className={`text-lg sm:text-3xl font-bold ${hasVoted ? "text-green-600" : "text-red-500"}`}>
              {hasVoted ? "Voted" : "Not Voted"}
            </p>
            <p className="text-gray-600 text-sm sm:text-base mt-2 sm:mt-4 text-center">
              {hasVoted
                ? "Thank you for participating in the election!"
                : "Please cast your vote before the deadline."}
            </p>
          </motion.div>
        </motion.div>

        {/* Voted Candidate Section and Election Results (Stacked vertically on small screens) */}
        <motion.div
          className="mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4 sm:gap-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          {/* Voted Candidate Section */}
          <motion.div
            className="p-4 sm:p-6 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow flex flex-col items-center justify-center"
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.5 }}
          >
            <h3 className="text-lg sm:text-2xl font-semibold text-gray-800 mb-2 sm:mb-4">Your Vote</h3>
            {hasVoted ? (
              <>
                <p className="mb-1 sm:mb-2 text-center text-lg sm:text-3xl font-bold text-yellow-500">
                  {votedCandidate.name}
                </p>
                <p className="text-center text-sm sm:text-2xl font-bold text-gray-800">
                  Party {votedCandidate.partyName}
                </p>
              </>
            ) : (
              <p className="text-center text-gray-600 text-sm sm:text-base">You have not voted yet.</p>
            )}
          </motion.div>

          {/* Election Results Section */}
          <motion.div
            className="p-4 sm:p-6 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow flex flex-col text-center"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.5 }}
          >
            <h3 className="text-lg sm:text-2xl font-semibold text-gray-800 mb-2 sm:mb-4">Election Results</h3>
            {votingEnded ? (
              <>
                <p className="text-base sm:text-xl font-bold text-gray-800">
                  {electionResult.isTie ? "It's a tie!" : `Winner: ${winnerDetails.name}`}
                </p>
                {!electionResult.isTie && (
                  <>
                    <p className="text-sm sm:text-lg text-gray-600">
                      Party: {winnerDetails.partyName}
                    </p>
                    <p className="text-sm sm:text-lg text-gray-600">Total Votes: {electionResult.maxVotes}</p>
                  </>
                )}
                {electionResult.isTie && (
                  <div className="mt-4">
                    <h4 className="text-base sm:text-xl font-semibold text-red-500">Tied Candidates:</h4>
                    <ul className="mt-2 space-y-2">
                      {tiedCandidates.map((candidate, index) => (
                        <li
                          key={index}
                          className="p-2 bg-gray-50 rounded-md shadow-sm flex flex-col items-center"
                        >
                          <span className="font-bold text-gray-800">{candidate.name}</span>
                          <span className="text-gray-600 italic">Party: {candidate.partyName}</span>
                          <span className="text-blue-600">Votes: {candidate.votes}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <p className="text-gray-600 text-sm sm:text-base">Voting has not ended yet.</p>
            )}
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Modal for Selecting Candidate */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-96">
            <h3 className="text-2xl font-semibold mb-4">Select Your Candidate</h3>
            <select
              value={selectedCandidate}
              onChange={(e) => setSelectedCandidate(e.target.value)}
              className="w-full p-3 border rounded-lg mb-4"
            >
              <option value="">Select a Candidate</option>
              {candidates.map((candidate, index) => (
                <option key={index} value={candidate.address}>{candidate.name}</option>
              ))}
            </select>
            <button
              onClick={handleVote}
              className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              disabled={!selectedCandidate}
            >
              Cast Vote
            </button>
            <button
              onClick={() => setIsModalOpen(false)}
              className="w-full py-2 bg-gray-300 text-gray-700 rounded-lg mt-2"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VoterDashboard;
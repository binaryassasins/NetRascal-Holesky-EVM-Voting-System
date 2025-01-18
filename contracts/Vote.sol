// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Voting {
    address public admin;
    bool public votingStarted;
    bool public votingEnded;

    struct Voter {
        bool isRegistered;
        bool hasVoted;
        address votedFor;
        string name;
        string nationalId;
        uint age;
        address voterAddress;
    }

    struct Candidate {
        string name;
        address candidateAddress;
        uint voteCount;
        string partyName;
    }

    mapping(address => Voter) public voters;
    mapping(address => Candidate) public candidates;
    address[] public candidatesList;
    address[] public tiedCandidates;

    address public currentWinner;
    uint public currentMaxVotes;

    event VoterRegistered(address indexed voter, string name, string nationalId, uint age);
    event CandidateRegistered(string name, address indexed candidate, string partyName);
    event VoteCasted(address indexed voter, address indexed candidate);
    event VotingStarted();
    event VotingEnded(address winner, uint maxVotes, bool isTie);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }

    modifier votingActive() {
        require(votingStarted && !votingEnded, "Voting is not active");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    function registerVoter(address _voterAddress, string memory _name, string memory _nationalId, uint _age) external onlyAdmin {
        require(!voters[_voterAddress].isRegistered, "Voter is already registered");
        voters[_voterAddress] = Voter(true, false, address(0), _name, _nationalId, _age, _voterAddress);
        emit VoterRegistered(_voterAddress, _name, _nationalId, _age);
    }

    // Function to verify voter credentials (National ID and address)
    function verifyVoter(address _voterAddress, string memory _nationalId) public view returns (bool) {
        Voter storage voter = voters[_voterAddress];
        if (voter.isRegistered && keccak256(abi.encodePacked(voter.nationalId)) == keccak256(abi.encodePacked(_nationalId))) {
            return true;
        }
        return false;
    }

    function registerCandidate(address _candidateAddress, string memory _name, string memory _partyName) external onlyAdmin {
        require(candidates[_candidateAddress].candidateAddress == address(0), "Candidate is already registered");
        candidates[_candidateAddress] = Candidate(_name, _candidateAddress, 0, _partyName);
        candidatesList.push(_candidateAddress);
        emit CandidateRegistered(_name, _candidateAddress, _partyName);
    }

    function startVoting() external onlyAdmin {
        require(candidatesList.length >= 2, "At least two candidates required");
        votingStarted = true;
        votingEnded = false;
        emit VotingStarted();
    }

    function endVoting() external onlyAdmin {
        require(votingStarted, "Voting has not started");
        require(!votingEnded, "Voting has already ended");
        votingStarted = false;
        votingEnded = true;

        bool isTie = checkForTie();

        emit VotingEnded(currentWinner, currentMaxVotes, isTie);
    }

    function vote(address _candidateAddress) external votingActive {
        Voter storage sender = voters[msg.sender];
        require(sender.isRegistered, "Only registered voters can vote");
        require(!sender.hasVoted, "Voter has already voted");
        require(candidates[_candidateAddress].candidateAddress != address(0), "Candidate does not exist");

        sender.hasVoted = true;
        sender.votedFor = _candidateAddress;
        candidates[_candidateAddress].voteCount++;

        if (candidates[_candidateAddress].voteCount > currentMaxVotes) {
            currentMaxVotes = candidates[_candidateAddress].voteCount;
            currentWinner = _candidateAddress;
        }

        emit VoteCasted(msg.sender, _candidateAddress);
    }

    function getAllCandidates() external view returns (Candidate[] memory) {
        Candidate[] memory allCandidates = new Candidate[](candidatesList.length);

        for (uint i = 0; i < candidatesList.length; i++) {
            allCandidates[i] = candidates[candidatesList[i]];
        }

        return allCandidates;
    }

    function checkForTie() internal returns (bool) {
        uint highestVoteCount = 0;
        delete tiedCandidates;

        for (uint i = 0; i < candidatesList.length; i++) {
            address candidateAddr = candidatesList[i];
            uint candidateVotes = candidates[candidateAddr].voteCount;

            if (candidateVotes > highestVoteCount) {
                highestVoteCount = candidateVotes;
                tiedCandidates = [candidateAddr];
            } else if (candidateVotes == highestVoteCount) {
                tiedCandidates.push(candidateAddr);
            }
        }

        return tiedCandidates.length > 1;
    }

    function getElectionResults() external view returns (address winner, uint maxVotes, bool isTie) {
        require(votingEnded, "Voting has not ended yet");
        return (currentWinner, currentMaxVotes, tiedCandidates.length > 1);
    }

    function getTiedCandidates() external view returns (Candidate[] memory) {
        require(votingEnded, "Voting has not ended yet");
        require(tiedCandidates.length > 1, "No tie detected");

        Candidate[] memory tiedCandidatesDetails = new Candidate[](tiedCandidates.length);
        for (uint i = 0; i < tiedCandidates.length; i++) {
            tiedCandidatesDetails[i] = candidates[tiedCandidates[i]];
        }

        return tiedCandidatesDetails;
    }
}

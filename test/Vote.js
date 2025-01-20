const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Voting contract", function () {
  let voting, admin, voter1, voter2, candidate1, candidate2;

  beforeEach(async () => {
    [admin, voter1, voter2, candidate1, candidate2] = await ethers.getSigners();
    const Voting = await ethers.getContractFactory("Voting");
    voting = await Voting.deploy();

    // Register candidates
    await voting.connect(admin).registerCandidate(candidate1.address, "Alice", "Party A");
    await voting.connect(admin).registerCandidate(candidate2.address, "Bob", "Party B");

    // Start voting
    await voting.connect(admin).startVoting();

    // Register voters
    await voting.connect(admin).registerVoter(voter1.address, "Voter One", "1234", 25);
    await voting.connect(admin).registerVoter(voter2.address, "Voter Two", "5678", 28);
  });

  // Test for Voter Registration
  describe("Voter Registration", function () {
    beforeEach(async function () {
      // Deploy the contract fresh and reset the state before each test
      const Voting = await ethers.getContractFactory("Voting");
      voting = await Voting.deploy();
    });
  
    it("should allow admin to register a voter", async function () {
      const name = "John Doe";
      const nationalId = "12345";
      const age = 30;
  
      await expect(voting.connect(admin).registerVoter(voter1.address, name, nationalId, age))
        .to.emit(voting, "VoterRegistered")
        .withArgs(voter1.address, name, nationalId, age);
  
      const registeredVoter = await voting.voters(voter1.address);
      expect(registeredVoter.isRegistered).to.be.true;
      expect(registeredVoter.name).to.equal(name);
      expect(registeredVoter.nationalId).to.equal(nationalId);
      expect(registeredVoter.age).to.equal(age);
    });
  });
  

  // Test for Voting Process
  describe("Voting Process", function () {
    it("should allow a registered voter to vote and update the vote count", async function () {
      await voting.connect(voter1).vote(candidate1.address);
      await voting.connect(voter2).vote(candidate2.address);

      const candidate1Details = await voting.candidates(candidate1.address);
      const candidate2Details = await voting.candidates(candidate2.address);

      expect(candidate1Details.voteCount).to.equal(1);
      expect(candidate2Details.voteCount).to.equal(1);
    });
  });

  // Test for Voting Result (Tie Detection)
  describe("Tie Detection", function () {
    it("should detect a tie in voting", async function () {
      await voting.connect(voter1).vote(candidate1.address);
      await voting.connect(voter2).vote(candidate2.address);

      // End voting and check for tie
      await voting.connect(admin).endVoting();

      const result = await voting.getElectionResults();
      expect(result.isTie).to.be.true;

      const tiedCandidates = await voting.getTiedCandidates();
      expect(tiedCandidates.length).to.equal(2);
    });
  });
});

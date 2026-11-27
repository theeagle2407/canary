// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

/// @notice Verifies precisely one 32-byte return value from a registered static call.
/// A passing result is not an audit, safety guarantee or proof of a state-changing operation.
contract Canary {
    enum Status { Unchecked, Pass, Fail, Error }
    enum Operator { Equal, GreaterOrEqual, LessOrEqual }
    struct Project { address owner; string name; uint256[] checkIds; }
    struct Check { uint256 projectId; string name; address target; bytes callData; Operator op; uint256 expected; uint32 maxAge; bool active; Status status; uint64 checkedAt; uint64 checkedBlock; uint256 observed; uint64 runs; }
    uint256 public projectCount;
    uint256 public checkCount;
    mapping(uint256 => Project) private projects;
    mapping(uint256 => Check) private checks;
    event ProjectRegistered(uint256 indexed projectId, address indexed owner, string name);
    event CheckRegistered(uint256 indexed projectId, uint256 indexed checkId, address target);
    event CheckRetired(uint256 indexed projectId, uint256 indexed checkId);
    event CheckExecuted(uint256 indexed projectId, uint256 indexed checkId, Status status, uint256 observed, uint64 checkedAt, uint64 checkedBlock, address runner);
    error InvalidInput(); error NotOwner(); error Inactive(); error InsufficientGas();
    function registerProject(string calldata name) external returns (uint256 id) {
        if (bytes(name).length == 0 || bytes(name).length > 80) revert InvalidInput();
        id = ++projectCount; Project storage p = projects[id]; p.owner = msg.sender; p.name = name;
        emit ProjectRegistered(id, msg.sender, name);
    }
    function registerCheck(uint256 projectId, string calldata name, address target, bytes calldata data, Operator op, uint256 expected, uint32 maxAge) external returns (uint256 id) {
        Project storage p = projects[projectId]; if (p.owner != msg.sender) revert NotOwner();
        if (bytes(name).length == 0 || bytes(name).length > 80 || target.code.length == 0 || data.length < 4 || data.length > 512 || maxAge < 60 || maxAge > 30 days || p.checkIds.length >= 64) revert InvalidInput();
        id = ++checkCount; Check storage c = checks[id]; c.projectId = projectId; c.name = name; c.target = target; c.callData = data; c.op = op; c.expected = expected; c.maxAge = maxAge; c.active = true; p.checkIds.push(id);
        emit CheckRegistered(projectId, id, target);
    }
    function retireCheck(uint256 id) external { Check storage c = checks[id]; if (projects[c.projectId].owner != msg.sender) revert NotOwner(); if (!c.active) revert Inactive(); c.active = false; emit CheckRetired(c.projectId,id); }
    function getProject(uint256 id) external view returns (address owner, string memory name, uint256[] memory checkIds) { Project storage p = projects[id]; return (p.owner,p.name,p.checkIds); }
    function getCheck(uint256 id) external view returns (Check memory) { return checks[id]; }
    function evaluate(uint256 id) public view returns (Status status, uint256 observed) {
        Check storage c = checks[id]; if (!c.active) revert Inactive();
        // Explicit headroom prevents low-gas runners from turning valid checks into false errors.
        if (gasleft() < 220000) revert InsufficientGas();
        address target = c.target; bytes memory data = c.callData; bool ok; uint256 size;
        // Copy at most one word, even if a hostile target returns enormous data.
        assembly { let ptr := mload(0x40) mstore(ptr, 0) ok := staticcall(100000, target, add(data,32), mload(data), ptr,32) size := returndatasize() observed := mload(ptr) }
        if (!ok || size != 32) return (Status.Error,0);
        bool pass = c.op == Operator.Equal ? observed == c.expected : c.op == Operator.GreaterOrEqual ? observed >= c.expected : observed <= c.expected;
        return (pass ? Status.Pass : Status.Fail,observed);
    }
    function run(uint256 id) external returns (Status status, uint256 observed) {
        (status,observed) = evaluate(id); Check storage c = checks[id]; c.status = status; c.observed = observed; c.checkedAt = uint64(block.timestamp); c.checkedBlock = uint64(block.number); c.runs++;
        emit CheckExecuted(c.projectId,id,status,observed,c.checkedAt,c.checkedBlock,msg.sender);
    }
    function isFreshPass(uint256 id) external view returns (bool) { Check storage c = checks[id]; return c.active && c.status == Status.Pass && block.timestamp <= uint256(c.checkedAt) + c.maxAge; }
}

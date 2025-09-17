local sessionKey = KEYS[1]
local playersKey = KEYS[2]
local playerOrderKey = KEYS[3]
local connectionsKey = KEYS[4]
local turnData = ARGV[1]
local playerName = ARGV[2]
local playerToken = ARGV[3]

if redis.call("EXISTS", sessionKey) == 0 then
  return redis.error_reply("ERR_404001 Session does not exist")
elseif redis.call("HGET", playersKey, playerName) ~= playerToken then
  return redis.error_reply("ERR_403001 Incorrect player token")
elseif redis.call("LLEN", playerOrderKey) <= 1 then
  return redis.error_reply("ERR_403004 At least two players are required")
end

local currentPlayer = cjson.decode(redis.call("JSON.GET", sessionKey, ".currentPlayer"))

if playerName ~= currentPlayer then
  return redis.error_reply("ERR_403005 Not current player")
end

local time = redis.call("TIME")
local seconds = tonumber(time[1])
local microseconds = tonumber(time[2])
local milliseconds = math.floor((seconds * 1000000 + microseconds) / 1000)

local nextPlayer = redis.call("LMOVE", playerOrderKey, playerOrderKey, "LEFT", "RIGHT")
if not nextPlayer or nextPlayer == currentPlayer then
  nextPlayer = nil
end

redis.call("JSON.ARRAPPEND", sessionKey, ".turns", turnData)
redis.call("JSON.SET", sessionKey, ".currentPlayer", cjson.encode(nextPlayer))
redis.call(
  "JSON.ARRAPPEND",
  sessionKey,
  ".eventLog",
  cjson.encode({
    event = "turn_ended",
    timestamp = milliseconds,
    data = {
      playerName = playerName,
    },
  })
)

redis.call("EXPIRE", sessionKey, 60 * 60 * 24)
redis.call("EXPIRE", playersKey, 60 * 60 * 24)
redis.call("EXPIRE", playerOrderKey, 60 * 60 * 24)
redis.call("EXPIRE", connectionsKey, 60 * 60 * 24)

return redis.call("JSON.GET", sessionKey, ".")

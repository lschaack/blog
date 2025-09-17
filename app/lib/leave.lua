local sessionKey = KEYS[1]
local playersKey = KEYS[2]
local playerOrderKey = KEYS[3]
local playerName = ARGV[1]
local playerToken = ARGV[2]

local playerPath = ".players." .. playerName
local foundPlayerToken = redis.call("HGET", playersKey, playerName)

if redis.call("EXISTS", sessionKey) == 0 then
  return redis.error_reply("ERR_404001 Session does not exist")
elseif foundPlayerToken == false then
  return redis.error_reply("ERR_404002 Player not in game")
elseif foundPlayerToken ~= playerToken then
  return redis.error_reply("ERR_403001 Incorrect or missing token")
end

local nPlayers = redis.call("HLEN", playersKey)

local currentPlayer = cjson.decode(redis.call("JSON.GET", sessionKey, ".currentPlayer"))
if nPlayers <= 2 and currentPlayer ~= "AI" then -- no longer enough players in the game
  currentPlayer = nil
elseif playerName == currentPlayer then
  currentPlayer = redis.call("LMOVE", playerOrderKey, playerOrderKey, "LEFT", "RIGHT")
end
redis.call("LREM", playerOrderKey, 1, playerName)

local time = redis.call("TIME")
local seconds = tonumber(time[1])
local microseconds = tonumber(time[2])
local milliseconds = math.floor((seconds * 1000000 + microseconds) / 1000)

redis.call("HDEL", playersKey, playerName)
redis.call("JSON.DEL", sessionKey, playerPath)
redis.call("JSON.SET", sessionKey, ".currentPlayer", cjson.encode(currentPlayer))

redis.call(
  "JSON.ARRAPPEND",
  sessionKey,
  ".eventLog",
  cjson.encode({
    event = "player_left",
    timestamp = milliseconds,
    data = {
      playerName = playerName,
    },
  })
)

return redis.call("JSON.GET", sessionKey, ".")

local sessionKey = KEYS[1]
local playersKey = KEYS[2]
local playerOrderKey = KEYS[3]
local connectionsKey = KEYS[4]
local playerName = ARGV[1]
local playerData = ARGV[2]
local playerToken = ARGV[3]

local playerPath = ".players." .. playerName

if redis.call("EXISTS", sessionKey) == 0 then
  return redis.error_reply("NOT_FOUND Session does not exist")
end

local gameType = cjson.decode(redis.call("JSON.GET", sessionKey, ".type"))
local nPlayers = redis.call("HLEN", playersKey)

if gameType == "singleplayer" and nPlayers >= 2 or nPlayers >= 8 then
  return redis.error_reply("FORBIDDEN Game is full")
elseif redis.call("HGET", playersKey, playerName) ~= false then
  return redis.error_reply("CONFLICT Player already in game")
end

redis.call("RPUSH", playerOrderKey, playerName)
local currentPlayer = cjson.decode(redis.call("JSON.GET", sessionKey, ".currentPlayer"))
if currentPlayer == cjson.null then
  if gameType == "singleplayer" then
    currentPlayer = playerName
  elseif nPlayers > 0 then -- this is the second player to join
    currentPlayer = redis.call("LMOVE", playerOrderKey, playerOrderKey, "LEFT", "RIGHT")

    -- edge case where player takes a turn, then all other players leave,
    -- then another player joins - in that case we need to rotate one more time
    -- since otherwise the player who stayed in would go twice
    if currentPlayer == redis.pcall("JSON.GET", sessionKey, ".turns[-1].author").ok then
      currentPlayer = redis.call("LMOVE", playerOrderKey, playerOrderKey, "LEFT", "RIGHT")
    end
  else
    currentPlayer = nil
  end
end

local time = redis.call("TIME")
local seconds = tonumber(time[1])
local microseconds = tonumber(time[2])
local milliseconds = math.floor((seconds * 1000000 + microseconds) / 1000)

redis.call(
  "JSON.MSET",
  sessionKey,
  playerPath,
  playerData,
  sessionKey,
  ".currentPlayer",
  cjson.encode(currentPlayer)
)

redis.call(
  "JSON.ARRAPPEND",
  sessionKey,
  ".eventLog",
  cjson.encode({
    event = "player_joined",
    timestamp = milliseconds,
    data = {
      playerName = playerName,
    },
  })
)

redis.call("HSET", playersKey, playerName, playerToken)

redis.call("EXPIRE", sessionKey, 60 * 60 * 24)
redis.call("EXPIRE", playersKey, 60 * 60 * 24)
redis.call("EXPIRE", playerOrderKey, 60 * 60 * 24)
redis.call("EXPIRE", connectionsKey, 60 * 60 * 24)
return redis.call("JSON.GET", sessionKey, ".")

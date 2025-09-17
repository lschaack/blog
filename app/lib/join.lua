local sessionKey = KEYS[1]
local playersKey = KEYS[2]
local playerOrderKey = KEYS[3]
local connectionsKey = KEYS[4]
local playerName = ARGV[1]
local playerData = ARGV[2]
local playerToken = ARGV[3]

local playerPath = ".players." .. playerName

if redis.call("EXISTS", sessionKey) == 0 then
  return redis.error_reply("ERR_404001 Session does not exist")
end

local gameType = cjson.decode(redis.call("JSON.GET", sessionKey, ".type"))
local nPlayers = redis.call("HLEN", playersKey)

if gameType == "singleplayer" and nPlayers >= 2 or nPlayers >= 8 then
  return redis.error_reply("ERR_403003 Game is full")
elseif redis.call("HGET", playersKey, playerName) ~= false then
  return redis.error_reply("ERR_409001 Player already in game")
end

local currentPlayer = cjson.decode(redis.call("JSON.GET", sessionKey, ".currentPlayer"))

if gameType == "singleplayer" then
  redis.call("RPUSH", playerOrderKey, playerName)

  if currentPlayer == cjson.null then
    currentPlayer = playerName
  end
else
  redis.call("LMOVE", playerOrderKey, playerOrderKey, "RIGHT", "LEFT")
  redis.call("RPUSH", playerOrderKey, playerName)
  local expectedCurrentPlayer = redis.call("LMOVE", playerOrderKey, playerOrderKey, "LEFT", "RIGHT")

  if currentPlayer == cjson.null then
    local prevAuthorRes = redis.pcall("JSON.GET", sessionKey, ".turns[-1].author")

    if not prevAuthorRes.err and expectedCurrentPlayer == cjson.decode(prevAuthorRes) then
      currentPlayer = redis.call("LMOVE", playerOrderKey, playerOrderKey, "LEFT", "RIGHT")
    else
      currentPlayer = expectedCurrentPlayer
    end
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

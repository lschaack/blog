local sessionKey = KEYS[1]
local connectionKey = KEYS[2]
local playerName = ARGV[1]
local playerData = ARGV[2]
local playerToken = ARGV[3]

local playerPath = ".players." .. playerName

if redis.call("EXISTS", sessionKey) == 0 then
  return redis.error_reply("NOT_FOUND Session does not exist")
elseif redis.call("JSON.TYPE", sessionKey, playerPath) ~= false then
  if redis.call("HGET", connectionKey, playerName) ~= playerToken then
    return redis.error_reply("CONFLICT Player already in game")
  else
    -- reconnection
    return nil
  end
end

local gameType = cjson.decode(redis.call("JSON.GET", sessionKey, ".type"))
local nPlayers = redis.call("JSON.OBJLEN", sessionKey, ".players")

if gameType == "singleplayer" and nPlayers >= 2 or nPlayers >= 8 then
  return redis.error_reply("FORBIDDEN Game is full")
else
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
    ".timestamp",
    cjson.encode(milliseconds)
  )

  redis.call("HSET", connectionKey, playerName, playerToken)

  redis.call("EXPIRE", sessionKey, 60 * 60)
  redis.call("EXPIRE", connectionKey, 60 * 60)

  return redis.call("JSON.GET", sessionKey, ".")
end

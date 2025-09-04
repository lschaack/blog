local sessionKey = KEYS[1]
local playerPath = ARGV[1]
local playerData = ARGV[2]

if redis.call("EXISTS", sessionKey) == 0 then
  return redis.error_reply("NOT_FOUND Session does not exist")
elseif redis.call("JSON.TYPE", sessionKey, playerPath) ~= false then
  return redis.error_reply("CONFLICT Player already in game")
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

  redis.call("EXPIRE", sessionKey, 60 * 60)

  return redis.call("JSON.GET", sessionKey, ".")
end

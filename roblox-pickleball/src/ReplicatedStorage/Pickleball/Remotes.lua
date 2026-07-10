local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")

local Remotes = {}

local EVENT_NAMES = {
	"ScoreUpdated",   -- server -> clients: {scoreA, scoreB, servingTeamName}
	"PointCalled",    -- server -> clients: {reason, faultingTeamName}
}

function Remotes.Get()
	local folder = ReplicatedStorage:FindFirstChild("PickleballRemotes")

	if not folder then
		if RunService:IsServer() then
			folder = Instance.new("Folder")
			folder.Name = "PickleballRemotes"
			folder.Parent = ReplicatedStorage
		else
			folder = ReplicatedStorage:WaitForChild("PickleballRemotes")
		end
	end

	local events = {}
	for _, name in ipairs(EVENT_NAMES) do
		local event = folder:FindFirstChild(name)
		if not event then
			if RunService:IsServer() then
				event = Instance.new("RemoteEvent")
				event.Name = name
				event.Parent = folder
			else
				event = folder:WaitForChild(name)
			end
		end
		events[name] = event
	end

	return events
end

return Remotes

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Players = game:GetService("Players")

local Config = require(ReplicatedStorage.Pickleball.Config)

local PaddleServer = {}

local function createPaddleTool()
	local tool = Instance.new("Tool")
	tool.Name = "Paddle"
	tool.RequiresHandle = true
	tool.CanBeDropped = false

	local handle = Instance.new("Part")
	handle.Name = "Handle"
	handle.Size = Vector3.new(1.4, 1.8, 0.25)
	handle.Color = Color3.fromRGB(180, 60, 60)
	handle.Material = Enum.Material.SmoothPlastic
	handle.CanCollide = false
	handle.Parent = tool

	local grip = Instance.new("Part")
	grip.Name = "Grip"
	grip.Size = Vector3.new(0.4, 1.4, 0.4)
	grip.Color = Color3.fromRGB(40, 40, 40)
	grip.CanCollide = false
	local weld = Instance.new("WeldConstraint")
	weld.Part0 = handle
	weld.Part1 = grip
	weld.Parent = grip
	grip.Parent = tool

	return tool
end

function PaddleServer.Start(refs, gameManager)
	local ball = refs.Ball
	local debounceUntil = {}

	local function equipPaddle(player)
		local character = player.Character
		if not character then
			return
		end

		if character:FindFirstChild("Paddle") then
			return
		end

		local tool = createPaddleTool()
		tool.Parent = character
		local humanoid = character:FindFirstChildOfClass("Humanoid")
		if humanoid then
			humanoid:EquipTool(tool)
		end

		tool.Handle.Touched:Connect(function(hit)
			if hit ~= ball then
				return
			end

			local now = os.clock()
			if debounceUntil[player] and now < debounceUntil[player] then
				return
			end
			debounceUntil[player] = now + 0.25

			if not player.Team then
				return
			end

			gameManager:RegisterHit(player.Team)

			local root = character:FindFirstChild("HumanoidRootPart")
			local aimDirection = root and root.CFrame.LookVector or Vector3.new(0, 0, 1)
			local sideSign = player.Team == refs.TeamA and 1 or -1
			local direction = Vector3.new(aimDirection.X, 0, sideSign)
			if direction.Magnitude > 0 then
				direction = direction.Unit
			end

			ball.AssemblyLinearVelocity = direction * Config.PADDLE_HIT_SPEED
				+ Vector3.new(0, Config.PADDLE_HIT_ARC, 0)
		end)
	end

	local function assignTeamAndSpawn(player)
		local teamACount, teamBCount = 0, 0
		for _, p in ipairs(Players:GetPlayers()) do
			if p.Team == refs.TeamA then
				teamACount += 1
			elseif p.Team == refs.TeamB then
				teamBCount += 1
			end
		end

		player.Team = teamACount <= teamBCount and refs.TeamA or refs.TeamB
	end

	Players.PlayerAdded:Connect(function(player)
		assignTeamAndSpawn(player)
		player.CharacterAdded:Connect(function(character)
			character:WaitForChild("HumanoidRootPart")
			equipPaddle(player)
		end)
	end)

	for _, player in ipairs(Players:GetPlayers()) do
		assignTeamAndSpawn(player)
		if player.Character then
			equipPaddle(player)
		end
		player.CharacterAdded:Connect(function(character)
			character:WaitForChild("HumanoidRootPart")
			equipPaddle(player)
		end)
	end
end

return PaddleServer

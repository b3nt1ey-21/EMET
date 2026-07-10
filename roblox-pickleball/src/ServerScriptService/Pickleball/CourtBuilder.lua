local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Teams = game:GetService("Teams")

local Config = require(ReplicatedStorage.Pickleball.Config)

local CourtBuilder = {}

local function part(props)
	local p = Instance.new("Part")
	p.Anchored = true
	p.TopSurface = Enum.SurfaceType.Smooth
	p.BottomSurface = Enum.SurfaceType.Smooth
	for key, value in pairs(props) do
		p[key] = value
	end
	return p
end

function CourtBuilder.Build()
	local model = Instance.new("Model")
	model.Name = "PickleballCourt"
	model.Parent = workspace

	local halfWidth = Config.COURT_WIDTH / 2
	local halfLength = Config.COURT_LENGTH / 2

	-- Court surface, split into two halves so we can tell which side the ball lands on.
	local courtA = part({
		Name = "CourtA",
		Size = Vector3.new(Config.COURT_WIDTH, 1, halfLength),
		Position = Vector3.new(0, 0, -halfLength / 2),
		Color = Color3.fromRGB(40, 110, 200),
		Material = Enum.Material.SmoothPlastic,
	})
	courtA.Parent = model

	local courtB = part({
		Name = "CourtB",
		Size = Vector3.new(Config.COURT_WIDTH, 1, halfLength),
		Position = Vector3.new(0, 0, halfLength / 2),
		Color = Color3.fromRGB(200, 90, 40),
		Material = Enum.Material.SmoothPlastic,
	})
	courtB.Parent = model

	-- Kitchen (non-volley zone) markings, purely visual.
	local kitchenA = part({
		Name = "KitchenA",
		Size = Vector3.new(Config.COURT_WIDTH, 1.05, Config.KITCHEN_DEPTH),
		Position = Vector3.new(0, 0.03, -Config.KITCHEN_DEPTH / 2),
		Color = Color3.fromRGB(230, 230, 230),
		Transparency = 0.4,
		CanCollide = false,
	})
	kitchenA.Parent = model

	local kitchenB = part({
		Name = "KitchenB",
		Size = Vector3.new(Config.COURT_WIDTH, 1.05, Config.KITCHEN_DEPTH),
		Position = Vector3.new(0, 0.03, Config.KITCHEN_DEPTH / 2),
		Color = Color3.fromRGB(230, 230, 230),
		Transparency = 0.4,
		CanCollide = false,
	})
	kitchenB.Parent = model

	-- Out-of-bounds apron surrounding the court so wild balls register a fault
	-- instead of falling forever.
	local outOfBounds = part({
		Name = "OutOfBounds",
		Size = Vector3.new(
			Config.COURT_WIDTH + Config.OUT_OF_BOUNDS_MARGIN * 2,
			1,
			Config.COURT_LENGTH + Config.OUT_OF_BOUNDS_MARGIN * 2
		),
		Position = Vector3.new(0, -0.6, 0),
		Color = Color3.fromRGB(60, 130, 60),
		Material = Enum.Material.Grass,
	})
	outOfBounds.Parent = model

	-- Net: a thin, tall part spanning the width at the center line.
	local net = part({
		Name = "Net",
		Size = Vector3.new(Config.COURT_WIDTH + 2, Config.NET_HEIGHT_POST, 0.3),
		Position = Vector3.new(0, Config.NET_HEIGHT_POST / 2, 0),
		Color = Color3.fromRGB(20, 20, 20),
		Transparency = 0.3,
		Material = Enum.Material.Fabric,
	})
	net.Parent = model

	-- Spawns.
	local spawnA = Instance.new("SpawnLocation")
	spawnA.Name = "SpawnA"
	spawnA.Size = Vector3.new(6, 1, 6)
	spawnA.Position = Vector3.new(0, 1, -halfLength + 4)
	spawnA.Anchored = true
	spawnA.CanCollide = true
	spawnA.Neutral = false
	spawnA.Parent = model

	local spawnB = Instance.new("SpawnLocation")
	spawnB.Name = "SpawnB"
	spawnB.Size = Vector3.new(6, 1, 6)
	spawnB.Position = Vector3.new(0, 1, halfLength - 4)
	spawnB.Anchored = true
	spawnB.CanCollide = true
	spawnB.Neutral = false
	spawnB.Parent = model

	-- Teams.
	local teamA = Teams:FindFirstChild("Team A") or Instance.new("Team")
	teamA.Name = "Team A"
	teamA.TeamColor = BrickColor.new("Bright blue")
	teamA.AutoAssignable = false
	teamA.Parent = Teams

	local teamB = Teams:FindFirstChild("Team B") or Instance.new("Team")
	teamB.Name = "Team B"
	teamB.TeamColor = BrickColor.new("Bright orange")
	teamB.AutoAssignable = false
	teamB.Parent = Teams

	spawnA.TeamColor = teamA.TeamColor
	spawnB.TeamColor = teamB.TeamColor

	-- Ball.
	local ball = Instance.new("Part")
	ball.Name = "Ball"
	ball.Shape = Enum.PartType.Ball
	ball.Size = Vector3.new(1, 1, 1)
	ball.Position = Vector3.new(0, 5, -halfLength + 4)
	ball.Color = Color3.fromRGB(250, 230, 60)
	ball.Material = Enum.Material.SmoothPlastic
	ball.CustomPhysicalProperties = PhysicalProperties.new(0.05, 0.3, Config.BALL_RESTITUTION)
	ball:SetAttribute("LastHitTeam", "")
	ball:SetAttribute("HasBounced", false)
	ball.Parent = model

	return {
		Model = model,
		CourtA = courtA,
		CourtB = courtB,
		Net = net,
		OutOfBounds = outOfBounds,
		SpawnA = spawnA,
		SpawnB = spawnB,
		TeamA = teamA,
		TeamB = teamB,
		Ball = ball,
		HalfLength = halfLength,
	}
end

return CourtBuilder

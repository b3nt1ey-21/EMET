local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Remotes = require(ReplicatedStorage.Pickleball.Remotes)
local remotes = Remotes.Get()

local screenGui = Instance.new("ScreenGui")
screenGui.Name = "PickleballScoreboard"
screenGui.ResetOnSpawn = false
screenGui.Parent = game:GetService("Players").LocalPlayer:WaitForChild("PlayerGui")

local frame = Instance.new("Frame")
frame.Size = UDim2.fromOffset(260, 70)
frame.Position = UDim2.new(0.5, -130, 0, 20)
frame.BackgroundColor3 = Color3.fromRGB(20, 20, 20)
frame.BackgroundTransparency = 0.25
frame.Parent = screenGui

local corner = Instance.new("UICorner")
corner.CornerRadius = UDim.new(0, 8)
corner.Parent = frame

local scoreLabel = Instance.new("TextLabel")
scoreLabel.Size = UDim2.new(1, 0, 0.65, 0)
scoreLabel.BackgroundTransparency = 1
scoreLabel.Font = Enum.Font.GothamBold
scoreLabel.TextScaled = true
scoreLabel.TextColor3 = Color3.fromRGB(255, 255, 255)
scoreLabel.Text = "0 - 0"
scoreLabel.Parent = frame

local serveLabel = Instance.new("TextLabel")
serveLabel.Size = UDim2.new(1, 0, 0.35, 0)
serveLabel.Position = UDim2.new(0, 0, 0.65, 0)
serveLabel.BackgroundTransparency = 1
serveLabel.Font = Enum.Font.Gotham
serveLabel.TextScaled = true
serveLabel.TextColor3 = Color3.fromRGB(200, 200, 200)
serveLabel.Text = "Serving: Team A"
serveLabel.Parent = frame

remotes.ScoreUpdated.OnClientEvent:Connect(function(scoreA, scoreB, servingTeamName)
	scoreLabel.Text = string.format("%d - %d", scoreA, scoreB)
	serveLabel.Text = "Serving: " .. servingTeamName
end)

remotes.PointCalled.OnClientEvent:Connect(function(reason, teamName)
	if reason == "GameOver" then
		serveLabel.Text = teamName .. " wins the game!"
	end
end)

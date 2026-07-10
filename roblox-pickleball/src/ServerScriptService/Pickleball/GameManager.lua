local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Players = game:GetService("Players")

local Config = require(ReplicatedStorage.Pickleball.Config)
local Remotes = require(ReplicatedStorage.Pickleball.Remotes)

local GameManager = {}
GameManager.__index = GameManager

function GameManager.new(refs)
	local self = setmetatable({}, GameManager)
	self.refs = refs
	self.remotes = Remotes.Get()
	self.score = { ["Team A"] = 0, ["Team B"] = 0 }
	self.servingTeam = refs.TeamA
	self.rallyActive = false
	self:_connectBall()
	self:_broadcastScore()
	return self
end

function GameManager:_otherTeam(team)
	return team == self.refs.TeamA and self.refs.TeamB or self.refs.TeamA
end

function GameManager:_broadcastScore()
	self.remotes.ScoreUpdated:FireAllClients(
		self.score["Team A"],
		self.score["Team B"],
		self.servingTeam.Name
	)
end

function GameManager:RegisterHit(hittingTeam)
	self.rallyActive = true
	local ball = self.refs.Ball
	ball:SetAttribute("LastHitTeam", hittingTeam.Name)
	ball:SetAttribute("HasBounced", false)
end

function GameManager:_awardPoint(winningTeam, reason)
	self.remotes.PointCalled:FireAllClients(reason, winningTeam.Name)

	if winningTeam == self.servingTeam then
		self.score[winningTeam.Name] += 1
	else
		self.servingTeam = winningTeam
	end

	self:_broadcastScore()
	self:_checkWin()
	self:_resetBall()
end

function GameManager:_checkWin()
	local a, b = self.score["Team A"], self.score["Team B"]
	local leader, leaderScore, otherScore
	if a > b then
		leader, leaderScore, otherScore = self.refs.TeamA, a, b
	else
		leader, leaderScore, otherScore = self.refs.TeamB, b, a
	end

	if leaderScore >= Config.WIN_SCORE and (leaderScore - otherScore) >= Config.WIN_BY then
		self.remotes.PointCalled:FireAllClients("GameOver", leader.Name)
		self.score["Team A"] = 0
		self.score["Team B"] = 0
		self.servingTeam = self.refs.TeamA
		self:_broadcastScore()
	end
end

function GameManager:_resetBall()
	local ball = self.refs.Ball
	local spawn = self.servingTeam == self.refs.TeamA and self.refs.SpawnA or self.refs.SpawnB
	ball.AssemblyLinearVelocity = Vector3.zero
	ball.AssemblyAngularVelocity = Vector3.zero
	ball.CFrame = CFrame.new(spawn.Position + Vector3.new(0, 4, 0))
	ball:SetAttribute("LastHitTeam", "")
	ball:SetAttribute("HasBounced", false)
	self.rallyActive = false
end

function GameManager:_connectBall()
	local ball = self.refs.Ball

	ball.Touched:Connect(function(hit)
		if not self.rallyActive then
			return
		end

		local lastHitTeamName = ball:GetAttribute("LastHitTeam")
		if lastHitTeamName == "" then
			return
		end

		local lastHitTeam = lastHitTeamName == self.refs.TeamA.Name and self.refs.TeamA or self.refs.TeamB
		local otherTeam = self:_otherTeam(lastHitTeam)

		if hit.Name == "Net" then
			self:_awardPoint(otherTeam, "NetFault")
			return
		end

		if hit.Name == "OutOfBounds" then
			self:_awardPoint(otherTeam, "OutOfBounds")
			return
		end

		if hit.Name == "CourtA" or hit.Name == "CourtB" then
			local landedOnOwnSide = (hit.Name == "CourtA" and lastHitTeam == self.refs.TeamA)
				or (hit.Name == "CourtB" and lastHitTeam == self.refs.TeamB)

			if landedOnOwnSide then
				self:_awardPoint(otherTeam, "LandedOwnSide")
				return
			end

			if ball:GetAttribute("HasBounced") then
				-- Second bounce before the other side returned it: they win the rally.
				self:_awardPoint(lastHitTeam, "DoubleBounce")
				return
			end

			ball:SetAttribute("HasBounced", true)
		end
	end)
end

return GameManager

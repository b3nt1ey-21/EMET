local CourtBuilder = require(script.Parent.CourtBuilder)
local GameManager = require(script.Parent.GameManager)
local PaddleServer = require(script.Parent.PaddleServer)

local refs = CourtBuilder.Build()
local gameManager = GameManager.new(refs)
PaddleServer.Start(refs, gameManager)

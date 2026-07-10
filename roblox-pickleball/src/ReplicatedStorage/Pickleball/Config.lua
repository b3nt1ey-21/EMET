-- Shared constants: 1 stud = 1 foot, matching real pickleball court dimensions.
return {
	COURT_WIDTH = 20,       -- feet, sideline to sideline
	COURT_LENGTH = 44,      -- feet, baseline to baseline
	KITCHEN_DEPTH = 7,      -- feet, non-volley zone depth from net each side
	NET_HEIGHT_CENTER = 3,  -- studs
	NET_HEIGHT_POST = 3.17, -- studs
	OUT_OF_BOUNDS_MARGIN = 15,

	WIN_SCORE = 11,
	WIN_BY = 2,

	BALL_RESTITUTION = 0.75,
	PADDLE_HIT_SPEED = 55,
	PADDLE_HIT_ARC = 12, -- upward speed component added on a hit
}

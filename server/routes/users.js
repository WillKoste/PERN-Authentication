const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const passport = require('passport');
const jwt = require('jsonwebtoken');

router.get('/id/:id', async (req, res) => {
	try {
		const user = await pool.query(`SELECT * FROM users WHERE id = ${req.params.id}`);

		if (user.rowCount === 0) {
			return res.status(404).json({success: false, data: `User ${req.params.id} could not be found.`});
		}

		res.json({success: true, data: user.rows[0]});
	} catch (err) {
		console.error(err);
	}
});

router.get('/username/:username', async (req, res) => {
	try {
		const user = await pool.query(`SELECT * FROM users WHERE username = $1`, [req.params.username]);

		if (user.rowCount === 0) {
			return res.status(404).json({success: false, data: `User with the username ${req.params.username} could not be found.`});
		}

		res.json({success: true, data: user.rows[0]});
	} catch (err) {
		console.error(err);
	}
});

router.post('/register', async (req, res) => {
	const {name, email, username, password} = req.body;

	let findEmail = await pool.query(`SELECT * FROM users WHERE email = $1`, [email]);

	if (findEmail.rowCount === 1) {
		return res.status(400).json({success: false, data: `The email address ${email} is already in use, please try another one or contact a site admin`});
	}

	try {
		const newUser = await pool.query(`INSERT INTO users (name, email, username, password) VALUES ($1, $2, $3, $4)`, [name, email, username, password]);

		const salt = await bcrypt.genSalt(10);

		const hashedPassword = await bcrypt.hash(password, salt);

		await pool.query(`UPDATE users SET password = $1 WHERE email = $2`, [hashedPassword, email]);

		let theUser = await pool.query(`SELECT id FROM users WHERE email = $1`, [email]);

		const payload = {
			theUser: {
				id: theUser.rows[0].id
			}
		};

		jwt.sign(
			payload,
			process.env.JWT_SECRET,
			{
				expiresIn: process.env.JWT_EXPIRES_IN
			},
			async (error, token) => {
				if (error) {
					await pool.query(`DELETE FROM users WHERE email = $1`, [email]);
					console.error(err);
					res.status(400).json({success: false, data: 'Please contact site admin'});
				} else {
					res.status(201).json({token});
				}
			}
		);
	} catch (err) {
		console.error(err);
		// CHECK IF ALREADY EXISTS

		res.status(500).send('Server Error');
	}
});

module.exports = router;

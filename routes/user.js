const express = require("express");
const router = express.Router();
const user = require("../models/user.js");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
require("dotenv").config();
const { body, validationResult } = require("express-validator");

const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const secKey = process.env.JWT_SECRET;
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_ADDRESS,
    pass: process.env.EMAIL_PASSWORD,
  },
});
router.post(
  "/createUser",
  [
    body("name", "Enter a valid name").isLength({ min: 3 }),
    body("email", "Enter a valid email").isEmail(),
    body("password", "Enter a valid password").isLength({ min: 5 }),
    body("phone").isLength({ min: 5 }),
  ],
  upload.fields([
    { name: "selfieImage", maxCount: 1 },
    { name: "passportImage", maxCount: 1 },
  ]),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(401).json({ errors: errors.array() });
    }

    try {
      let user_ = await user.findOne({ email: req.body.email });
      if (user_ && !user_.isVerified) {
        return res.status(400).send("User already exist with same email");
      }
      if (user_ && user_.isVerified) {
        return res.status(400).send("User already exist and verified");
      }
      const salt = bcrypt.genSaltSync(10);
      const secPassword = bcrypt.hashSync(req.body.password, salt);
      const verificationCode = Math.floor(
        100000 + Math.random() * 900000
      ).toString();
      const codeExpiry = new Date();
      codeExpiry.setMinutes(codeExpiry.getMinutes() + 10);

      user_ = await user.create({
        name: req.body.name,
        password: secPassword,
        email: req.body.email,
        phone: req.body.phone,
        verificationCode: verificationCode,
        codeExpiry: codeExpiry,
        investedAmount: 0,
        isVerifedbyAdmin: false,
        address: "null",
      });
      const info = await transporter.sendMail({
        from: process.env.EMAIL_ADDRESS,
        to: req.body.email,
        subject: "Your Verification Code",
        text: `Your verification code is: ${verificationCode}`,
      });
      const data = {
        user: {
          email: req.body.email,
        },
      };
      const authToken = jwt.sign(data, secKey);
      return res.send(authToken);
    } catch (error) {
      console.log(error.message);
      return res.status(500).send("Some Error Occured");
    }
  }
);

router.post(
  "/login",
  [
    body("email", "Input should be an email").isEmail(),
    body("password", "Password should not be empty").exists(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const user_ = await user.findOne({ email: req.body.email });
      if (!user_) {
        return res.status(401).send("Enter valid credentials");
      }

      const password = await bcrypt.compare(req.body.password, user_.password);

      if (!password) {
        return res.status(401).send("Enter valid credentials");
      }

      const checkVerification = user_.isVerified;
      if (!checkVerification) {
        return res.status(401).send("Verify yourself");
      }

      if (!user_.isVerifedbyAdmin) {
        return res.status(401).send("Verify your identity");
      }

      const data = {
        user: {
          id: user_.id,
        },
      };

      const authToken = jwt.sign(data, secKey);
      // console.log(user_);
      if (user_.isAdmin) {
        return res
          .status(200)
          .send({ message: "Admin Login", authToken: authToken });
      }
      return res.status(200).send({ authToken: authToken });
    } catch (error) {
      console.log("Errors :", error);
      return res.status(500).send("Internal server error");
    }
  }
);

// router.post("/getUser", async (req, res) => {
//   const { authToken } = req.body;
//   try {
//     if (!authToken) {
//       res.status(401).send({ error: "Access Denied" });
//     }

//     try {
//       const data = jwt.verify(authToken, secKey);
//       const { email } = data.user;
//       const user_ = await user.findOne({ email: email }).select("-password");
//       if (!user_) {
//         return res.status(400).send("User doesn't exist.");
//       }
//       const data_ = {
//         user: {
//           name: user_.name,
//         },
//       };
//       res.send(data_);
//     } catch (error) {
//       return res.status(401).send({ error: "Access Denied" });
//     }
//   } catch (error) {
//     console.error(error);
//     return res.status(500).send("Some error occurred during verification.");
//   }
// });

router.post("/verify", async (req, res) => {
  const { authToken, code } = req.body;
  try {
    if (!authToken) {
      res.status(401).send({ error: "Access Denied" });
    }
    try {
      const data = jwt.verify(authToken, secKey);
      const { email } = data.user;
      const user_ = await user.findOne({ email: email }).select("-password");
      if (!user_) {
        return res.status(401).send("User doesn't exist.");
      }
      if (user_.isVerified) {
        return res.status(400).send("User is already verified");
      }
      if (new Date() > user_.codeExpiry) {
        // If the code has expired, generate a new one and send to the user's email.
        const newVerificationCode = Math.floor(
          100000 + Math.random() * 900000
        ).toString();
        const newCodeExpiry = new Date();
        newCodeExpiry.setMinutes(newCodeExpiry.getMinutes() + 10);
        user_.verificationCode = newVerificationCode;
        user_.codeExpiry = newCodeExpiry;
        await user_.save();
        const mailOptions = {
          from: process.env.EMAIL_ADDRESS,
          to: user_.email,
          subject: "Your New Verification Code",
          text: `Your new verification code is: ${newVerificationCode}`,
        };
        await transporter.sendMail(mailOptions, (error) => {
          if (error) {
            console.error("Failed to send email:", error);
            return res
              .status(500)
              .send("Error sending new verification email.");
          }
          console.log("New verification email sent.");
          return res
            .status(400)
            .send(
              "Verification code has expired. A new code has been sent to your email."
            );
        });
      } else if (code !== user_.verificationCode) {
        return res.status(400).send("Invalid verification code.");
      } else {
        user_.isVerified = true;
        await user_.save();
        const tokenData = {
          user: {
            id: user_.id,
          },
        };
        const authToken = jwt.sign(tokenData, process.env.JWT_SECRET);
        return res.json({ token: authToken });
      }
    } catch (error) {
      return res.status(401).send({ error: "Access Denied" });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).send("Some error occurred during verification.");
  }
});

router.post("/getUsers", async (req, res) => {
  const { authToken } = req.body;
  // console.log(authToken);
  if (!authToken) {
    return res.status(401).send("Not authenticated user");
  }
  const verifyToken = jwt.verify(authToken, secKey);
  if (!verifyToken) {
    return res.status(401).send("Not authenticated user");
  }
  const { id } = verifyToken.user;

  const admin = await user.findOne({ _id: id });
  if (!admin) {
    return res.status(401).send("Not authenticated user");
  }
  if (!admin.isAdmin) {
    return res.status(401).send("Not authenticated user");
  }
  try {
    const users = await user.find();
    return res.send(users);
  } catch (error) {
    console.error(error);
    return res.status(500).send("Internal Server Error");
  }
});

router.post("/getAdmin", async (req, res) => {
  const { id, authToken } = req.body;
  if (!authToken) {
    return res.status(401).send("Not authenticated user");
  }
  const verifyToken = jwt.verify(authToken, secKey);
  if (!verifyToken) {
    return res.status(401).send("Not authenticated user");
  }
  const { id: adminId } = verifyToken.user;

  const admin = await user.findOne({ _id: adminId });
  if (!admin) {
    return res.status(401).send("Not authenticated user");
  }
  if (!admin.isAdmin) {
    return res.status(401).send("Not authenticated user");
  }
  try {
    const user_ = await user.findById({ _id: id });
    return res.send(user_);
  } catch (error) {
    console.error(error);
    return res.status(500).send("Internal Server Error");
  }
});

router.post("/getUser", async (req, res) => {
  const { authToken } = req.body;
  // res.send(authToken);
  // console.log(authToken);
  if (!authToken) {
    return res.status(401).send("Not authenticated user");
  }
  const verifyToken = jwt.verify(authToken, secKey);
  if (!verifyToken) {
    return res.status(401).send("Not authenticated user");
  }
  
  try {
    const user_ = await user.findById({ _id: verifyToken.user.id }).select("-password")
    return res.send(user_);
  } catch (error) {
    console.error(error);
    return res.status(500).send("Internal Server Error");
  }
});

router.post("/updateUser", async (req, res) => {
  const { _id, investedAmount, adminVerification, authToken } = req.body;
  if (!authToken) {
    return res.status(401).send("Not authenticated user");
  }
  const verifyToken = jwt.verify(authToken, secKey);
  if (!verifyToken) {
    return res.status(401).send("Not authenticated user");
  }
  const { id: adminId } = verifyToken.user;

  const admin = await user.findOne({ _id: adminId });
  if (!admin) {
    return res.status(401).send("Not authenticated user");
  }
  if (!admin.isAdmin) {
    return res.status(401).send("Not authenticated user");
  }

  try {
    const user_ = await user.findOne({ _id: _id }).select("-password");
    if (!user_) {
      return res.status(400).send("User does not exist");
    }

    user_.isVerifedbyAdmin = adminVerification;
    user_.investedAmount = investedAmount;
    await user_.save();
    // console.log(user_);
    return res.status(200).send("User updated successfully");
  } catch (error) {
    console.log("Error : ", error);
    return res.status(500).send("Internal server error");
  }
});

module.exports = router;

// router.post("/updateUser", async (req, res) => {
//   const { _id, name, email, phone, investedAmount, isVerifiedByAdmin } =
//     req.body;

//   try {
//     const updatedUser = await user.findByIdAndUpdate(_id, {
//       name: name,
//       email: email,
//       phone: phone,
//       investedAmount: investedAmount,
//       isVerifiedByAdmin: isVerifiedByAdmin,
//     });
//     return res.json({ message: "User updated successfully." });
//   } catch (error) {
//     console.error("Error updating user:", error);
//     res.status(500).send("Error updating user.");
//   }
// });

// router.post(
//   "/uploadVerification",
//   upload.array("image", 2),
//   async (req, res) => {
//     const { authToken } = req.body;
//     try {
//       if (!authToken) {
//         res.status(401).send({ error: "Access Denied" });
//       }

//       const data = jwt.verify(authToken, secKey);
//       const { email } = data.user;

//       const findUser = user.findOne({ email: email }).select("-password");
//       if (!findUser) {
//         return res.send("User doesnot exist");
//       }
//       // console.log(findUser);
//       // if (!findUser.isVerified) {
//       //   return res.send("Verify your email ");
//       // }

//       // console.log(req.files);
//       const passportImage = req.files[1].buffer;
//       const selfieImage = req.files[0].buffer;
//       // console.log(passportImage);
//       const updateUser = user.findOneAndUpdate(
//         { email: email },
//         { $set: { selfieImage: selfieImage, passportImage: passportImage } },
//         { new: true }
//       );
//       console.log("I am here");
//       console.log(updateUser);
//       return res.send("User saved successfully");
//     } catch (error) {
//       console.error(error);
//       return res.status(500).send("Some error occurred during verification.");
//     }
//   }
// );

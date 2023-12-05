const express = require("express");
const router = express.Router();
const multer = require("multer");
const Image = require("../models/image.js");
const User = require("../models/user.js");
const jwt = require("jsonwebtoken");

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const secKey = "Iamboy##@!we";

router.post(
  "/uploadVerification",
  upload.array("image", 2),
  async (req, res) => {
    try {
      const { authToken, address } = req.body;

      if (!authToken) {
        return res.status(401).send("Authenticatoin Failed");
      }

      const data = jwt.verify(authToken, secKey);

      const { email } = data.user;

      const user = await User.findOne({ email: email }).select("-password");

      if (!user) {
        console.log("User does not exist");
        return res.status(401).send("Authentication Failed");
      }

      if (!user.isVerified) {
        console.log("Email not verified");
        return res.status(401).send("Email not verified");
      }

      user.address = address;
      await user.save();

      const selfie = req.files[1].buffer;
      const passport = req.files[0].buffer;

      const imageSaved = await Image.findOne({ email: email });
      if (imageSaved) {
        imageSaved.email = email;
        imageSaved.selfieImage = {
          data: selfie,
        };
        imageSaved.passportImage = {
          data: passport,
        };
        await imageSaved.save();
      } else {
        const uploadImages = new Image({
          email: email,
          selfieImage: {
            data: selfie,
            contentType: req.files[1].mimetype,
          },
          passportImage: {
            data: passport,
            contentType: req.files[0].mimetype,
          },
        });

        await uploadImages.save();
      }
      return res.status(200).send("Data saved successfully");
      // const selfieImage_ = req.files[1].buffer;
      // const passportImage_ = req.files[0].buffer;
      // const uploadUserVerification = new Image({
      //   selfieImage: {
      //     data: selfieImage_,
      //     // contentType: req.file.mimetype,
      //   },
      //   passportImage: {
      //     data: passportImage_,
      //     // contentType: req.file.mimetype,
      //   },
      // });
      // await uploadUserVerification.save();
      // console.log(uploadUserVerification);
    } catch (error) {
      console.log("Error : " + error);
      return res.status(500).send("Internal Server Error");
    }
  }
);

router.post("/images", async (req, res) => {
  const { email, authToken } = req.body;
  if (!authToken) {
    return res.status(401).send("Not authenticated user");
  }
  const verifyToken = jwt.verify(authToken, secKey);
  if (!verifyToken) {
    return res.status(401).send("Not authenticated user");
  }
  const { id: adminId } = verifyToken.user;

  const admin = await User.findOne({ _id: adminId });
  if (!admin) {
    return res.status(401).send("Not authenticated user");
  }
  if (!admin.isAdmin) {
    return res.status(401).send("Not authenticated user");
  }
  try {
    const images = await Image.findOne({ email: email });
    if (!images) {
      return res
        .status(400)
        .send("User does not upload any identfication documents");
    }
    const imagesWithBase64 = {
      selfieImage: images.selfieImage.data.toString("base64"),
      passportImage: images.passportImage.data.toString("base64"),
    };
    return res.send(imagesWithBase64);
  } catch (error) {
    console.log("Error : ", error);
    return res.status(500).send("Internal server error");
  }

  // console.log(images.selfieImage.toString("base64"));
  // Convert the binary data to Base64 before sending it
  // const imagesWithBase64 = images.map((image) => ({
  //   image: {
  //     // contentType: image.image.contentType,
  //     data: image.toString("base64"),
  //   },
  // }));
  // console.log(images.selfieImage.data.toString("base64"));
  // res.send(images.selfieImage.data.toString("base64"));
  // const imagesWithBase64 = {
  //   selfieImage: images.selfieImage.toString("base64"),
  //   passportImage: images.passportImage.toString("base64"),

  // };
});

module.exports = router;

// try {
//   const uploadImage = new Image({
//     image: {
//       data: req.file.buffer,
//       contentType: req.file.mimetype, // Use the content type from the uploaded file
//     },
//   });
//   await uploadImage.save();
//   res.status(200).send("Image uploaded successfully");
// } catch (error) {
//   console.log("Error in uploading image : ", error);
//   res.status(500).send("Image not saved in MongoDB");
// }
//

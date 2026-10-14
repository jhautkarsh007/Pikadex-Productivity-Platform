
require("dotenv").config();

var express = require("express");
const app = express();
const path = require("path");

const socketio = require("socket.io");

var formidable = require("express-formidable");
app.use(formidable());

var mongodb = require("mongodb");
var mongoClient = mongodb.MongoClient;
var ObjectId = mongodb.ObjectId;

var http = require("http").createServer(app);
var bcrypt = require("bcrypt");
var fileSystem = require("fs");

var jwt = require("jsonwebtoken");
const accessTokenSecret = process.env.JWT_SECRET;

if (!accessTokenSecret) {
  throw new Error("JWT_SECRET is missing from environment variables.");
}

// Verify JWTs supplied by existing authenticated API requests.

const protectedApiPaths = new Set([
  "/getUser",
  "/uploadCoverPhoto",
  "/uploadProfileImage",
  "/updateProfile",
  "/addPost",
  "/getNewsfeed",
  "/toggleLikePost",
  "/postComment",
  "/postReply",
  "/sharePost",
  "/markNotificationsAsRead"
]);

app.use(function (req, res, next) {
  const token =
    (req.fields && req.fields.accessToken) ||
    (req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
      ? req.headers.authorization.slice(7)
      : null);

  const requiresToken =
    req.method === "POST" && protectedApiPaths.has(req.path);

  if (!token) {
    if (requiresToken) {
      return res.status(401).json({
        status: "error",
        message: "Authentication required."
      });
    }

    return next();
  }

  jwt.verify(token, accessTokenSecret, function (error, decoded) {
    if (error) {
      return res.status(401).json({
        status: "error",
        message:
          error.name === "TokenExpiredError"
            ? "Session expired. Please log in again."
            : "Invalid authentication token."
      });
    }

    req.auth = decoded;
    next();
  });
});


app.use("/public", express.static(__dirname + "/public"));
// Serve the production React frontend.
app.use(express.static(path.join(__dirname, "client", "dist")));
app.set("view engine", "ejs");

const io = socketio(http);
var socketID = "";
var users = [];

const PORT = Number(process.env.PORT || 3000);
const mainURL = process.env.APP_URL || `http://localhost:${PORT}`;

io.on("connection", function (socket) {
  console.log("User connected", socket.id);
  socketID = socket.id;
});

http.listen(PORT, "0.0.0.0", function () {
  console.log("Server started at " + mainURL);

  mongoClient.connect(
    process.env.MONGODB_URI,
    { useUnifiedTopology: true },
    function (error, client) {
      // Stop startup if MongoDB is unavailable
      if (error || !client) {
        console.error(
          "MongoDB connection failed:",
          error ? error.message : "No database client returned."
        );

        http.close(() => {
          process.exit(1);
        });

        return;
      }

      const database = client.db(
        process.env.MONGODB_DB || "free_social_network"
      );

      console.log("Database connected.");

      app.get("/pro-versions", function (request, result) {
        result.render("proVersions");
      });

      app.get("/profileViews", function (request, result) {
        result.render("profileViews");
      });

      app.get("/signup", function (request, result) {
        result.render("signup");
      });

      app.post("/signup", function (request, result) {
        var name = request.fields.name;
        var username = request.fields.username;
        var email = request.fields.email;
        var password = request.fields.password;
        var gender = request.fields.gender;
        var reset_token = "";

        database.collection("users").findOne(
          {
            $or: [
              {
                email: email,
              },
              {
                username: username,
              },
            ],
          },
          function (error, user) {
            if (user == null) {
              bcrypt.hash(password, 10, function (error, hash) {
                database.collection("users").insertOne(
                  {
                    name: name,
                    username: username,
                    email: email,
                    password: hash,
                    gender: gender,
                    reset_token: reset_token,
                    profileImage: "",
                    coverPhoto: "",
                    dob: "",
                    city: "",
                    country: "",
                    aboutMe: "",
                    friends: [],
                    pages: [],
                    notifications: [],
                    groups: [],
                    posts: [],
                  },
                  function (error, data) {
                    result.json({
                      status: "success",
                      message: "Signed up successfully. You can login now.",
                    });
                  }
                );
              });
            } else {
              result.json({
                status: "error",
                message: "Email or username already exist.",
              });
            }
          }
        );
      });

      app.get("/login", function (request, result) {
        result.render("login");
      });

      app.post("/login", function (request, result) {
        var email = request.fields.email;
        var password = request.fields.password;
        database.collection("users").findOne(
          {
            email: email,
          },
          function (error, user) {
            if (user == null) {
              result.json({
                status: "error",
                message: "Email does not exist",
              });
            } else {
              bcrypt.compare(
                password,
                user.password,
                function (error, isVerify) {
                  if (isVerify) {
                    var accessToken = jwt.sign(
                      { email: email },
                      accessTokenSecret,
                      { expiresIn: "1h" }
                    );
                    database.collection("users").findOneAndUpdate(
                      {
                        email: email,
                      },
                      {
                        $set: {
                          accessToken: accessToken,
                        },
                      },
                      function (error, data) {
                        result.json({
                          status: "success",
                          message: "Login successfully",
                          accessToken: accessToken,
                          profileImage: user.profileImage,
                        });
                      }
                    );
                  } else {
                    result.json({
                      status: "error",
                      message: "Password is not correct",
                    });
                  }
                }
              );
            }
          }
        );
      });

      app.get("/user/:username", function (request, result) {
        database.collection("users").findOne(
          {
            username: request.params.username,
          },
          function (error, user) {
            if (user == null) {
              result.send({
                status: "error",
                message: "User does not exists",
              });
            } else {
              result.render("userProfile", {
                user: user,
              });
            }
          }
        );
      });

      app.get("/updateProfile", function (request, result) {
        result.render("updateProfile");
      });

      app.post("/getUser", function (request, result) {
        var accessToken = request.fields.accessToken;
        database.collection("users").findOne(
          {
            accessToken: accessToken,
          },
          function (error, user) {
            if (user == null) {
              result.json({
                status: "error",
                message: "User has been logged out. Please login again.",
              });
            } else {
              result.json({
                status: "success",
                message: "Record has been fetched.",
                data: user,
              });
            }
          }
        );
      });

      
      // Show a logout page that clears the browser token
      app.get("/logout", function (req, res) {
        res.type("html").send(`
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <title>Logging out</title>
          </head>
          <body>
            <p>Logging out...</p>
            <script>
              const token = localStorage.getItem("accessToken");

              if (!token) {
                window.location.replace("/login");
              } else {
                fetch("/logout", {
                  method: "POST",
                  headers: {
                    "Authorization": "Bearer " + token
                  }
                })
                  .then(async response => {
                    const data = await response.json();

                    if (!response.ok || data.status !== "success") {
                      throw new Error(data.message || "Logout failed");
                    }

                    localStorage.removeItem("accessToken");
                    window.location.replace("/login");
                  })
                  .catch(error => {
                    console.error("Server-side logout failed:", error);
                    document.body.innerText =
                      "Logout failed. Check the browser console.";
                  });
              }
            </script>


          </body>
          </html>
        `);
      });

      // Revoke the stored token in MongoDB
      
      app.post("/logout", function (req, res) {
        const authHeader = req.get("Authorization") || "";
        const accessToken =
          (req.fields && req.fields.accessToken) ||
          (req.body && req.body.accessToken) ||
          (authHeader.startsWith("Bearer ")
            ? authHeader.slice(7)
            : null);
        if (!accessToken) {
          return res.status(400).json({
            status: "error",
            message: "Missing access token."
          });
        }

        database.collection("users").updateOne(
          { accessToken: accessToken },
          { $unset: { accessToken: "" } },
          function (error, result) {
            if (error) {
              console.error("Logout database error:", error.message);

              return res.status(500).json({
                status: "error",
                message: "Unable to invalidate the session."
              });
            }

            const matched =
              result.matchedCount ??
              (result.result && result.result.n) ??
              0;

            if (matched === 0) {
              return res.status(401).json({
                status: "error",
                message: "Token not found or already logged out."
              });
            }

            res.json({
              status: "success",
              message: "Server session invalidated."
            });
          }
        );
      });



      app.post("/uploadCoverPhoto", function (request, result) {
        var accessToken = request.fields.accessToken;
        var coverPhoto = "";

        database.collection("users").findOne(
          {
            accessToken: accessToken,
          },
          function (error, user) {
            if (user == null) {
              result.json({
                status: "error",
                message: "User has been logged out. Please login again.",
              });
            } else {
              if (
                request.files.coverPhoto.size > 0 &&
                request.files.coverPhoto.type.includes("image")
              ) {
                if (user.coverPhoto != "") {
                  fileSystem.unlink(user.coverPhoto, function (error) {
                    //
                  });
                }

                coverPhoto =
                  "public/images/" +
                  new Date().getTime() +
                  "-" +
                  request.files.coverPhoto.name;

                // Read the file
                fileSystem.readFile(
                  request.files.coverPhoto.path,
                  function (err, data) {
                    if (err) throw err;
                    console.log("File read!");

                    // Write the file
                    fileSystem.writeFile(coverPhoto, data, function (err) {
                      if (err) throw err;
                      console.log("File written!");

                      database.collection("users").updateOne(
                        {
                          accessToken: accessToken,
                        },
                        {
                          $set: {
                            coverPhoto: coverPhoto,
                          },
                        },
                        function (error, data) {
                          result.json({
                            status: "status",
                            message: "Cover photo has been updated.",
                            data: mainURL + "/" + coverPhoto,
                          });
                        }
                      );
                    });

                    // Delete the file
                    fileSystem.unlink(
                      request.files.coverPhoto.path,
                      function (err) {
                        if (err) throw err;
                        console.log("File deleted!");
                      }
                    );
                  }
                );
              } else {
                result.json({
                  status: "error",
                  message: "Please select valid image.",
                });
              }
            }
          }
        );
      });

      app.post("/uploadProfileImage", function (request, result) {
        var accessToken = request.fields.accessToken;
        var profileImage = "";

        database.collection("users").findOne(
          {
            accessToken: accessToken,
          },
          function (error, user) {
            if (user == null) {
              result.json({
                status: "error",
                message: "User has been logged out. Please login again.",
              });
            } else {
              if (
                request.files.profileImage.size > 0 &&
                request.files.profileImage.type.includes("image")
              ) {
                if (user.profileImage != "") {
                  fileSystem.unlink(user.profileImage, function (error) {
                    //
                  });
                }

                profileImage =
                  "public/images/" +
                  new Date().getTime() +
                  "-" +
                  request.files.profileImage.name;

                // Read the file
                fileSystem.readFile(
                  request.files.profileImage.path,
                  function (err, data) {
                    if (err) throw err;
                    console.log("File read!");

                    // Write the file
                    fileSystem.writeFile(profileImage, data, function (err) {
                      if (err) throw err;
                      console.log("File written!");

                      database.collection("users").updateOne(
                        {
                          accessToken: accessToken,
                        },
                        {
                          $set: {
                            profileImage: profileImage,
                          },
                        },
                        function (error, data) {
                          result.json({
                            status: "status",
                            message: "Profile image has been updated.",
                            data: mainURL + "/" + profileImage,
                          });
                        }
                      );
                    });

                    // Delete the file
                    fileSystem.unlink(
                      request.files.profileImage.path,
                      function (err) {
                        if (err) throw err;
                        console.log("File deleted!");
                      }
                    );
                  }
                );
              } else {
                result.json({
                  status: "error",
                  message: "Please select valid image.",
                });
              }
            }
          }
        );
      });

      app.post("/updateProfile", function (request, result) {
        var accessToken = request.fields.accessToken;
        var name = request.fields.name;
        var dob = request.fields.dob;
        var city = request.fields.city;
        var country = request.fields.country;
        var aboutMe = request.fields.aboutMe;

        database.collection("users").findOne(
          {
            accessToken: accessToken,
          },
          function (error, user) {
            if (user == null) {
              result.json({
                status: "error",
                message: "User has been logged out. Please login again.",
              });
            } else {
              database.collection("users").updateOne(
                {
                  accessToken: accessToken,
                },
                {
                  $set: {
                    name: name,
                    dob: dob,
                    city: city,
                    country: country,
                    aboutMe: aboutMe,
                  },
                },
                function (error, data) {
                  result.json({
                    status: "status",
                    message: "Profile has been updated.",
                  });
                }
              );
            }
          }
        );
      });

      app.get("/post/:id", function (request, result) {
        database.collection("posts").findOne(
          {
            _id: ObjectId(request.params.id),
          },
          function (error, post) {
            if (post == null) {
              result.send({
                status: "error",
                message: "Post does not exist.",
              });
            } else {
              result.render("postDetail", {
                post: post,
              });
            }
          }
        );
      });

      app.get("/index", (req, res) => {
        res.render("index");
      });

      var bodyParse = require("body-parser");
      const path = require("path");
      app.use(express.static(path.join(__dirname, "public")));

      app.use(bodyParse.json());
      app.use(express.static("public"));
      app.use(
        bodyParse.urlencoded({
          extended: true,
        })
      );

      app.get("/", (req, res) => {
        res.set({
          "Allow-access-Allow-Origin": "*",
        });

        return res.redirect("index.html");
      });

      app.post("/addPost", function (request, result) {
        var accessToken = request.fields.accessToken;
        var caption = request.fields.caption;
        var image = "";
        var video = "";
        var type = request.fields.type;
        var createdAt = new Date().getTime();
        var _id = request.fields._id;

        database.collection("users").findOne(
          {
            accessToken: accessToken,
          },
          function (error, user) {
            if (user == null) {
              result.json({
                status: "error",
                message: "User has been logged out. Please login again.",
              });
            } else {
              if (
                request.files.image.size > 0 &&
                request.files.image.type.includes("image")
              ) {
                image =
                  "public/images/" +
                  new Date().getTime() +
                  "-" +
                  request.files.image.name;

                // Read the file
                fileSystem.readFile(
                  request.files.image.path,
                  function (err, data) {
                    if (err) throw err;
                    console.log("File read!");

                    // Write the file
                    fileSystem.writeFile(image, data, function (err) {
                      if (err) throw err;
                      console.log("File written!");
                    });

                    // Delete the file
                    fileSystem.unlink(request.files.image.path, function (err) {
                      if (err) throw err;
                      console.log("File deleted!");
                    });
                  }
                );
              }

              if (
                request.files.video.size > 0 &&
                request.files.video.type.includes("video")
              ) {
                video =
                  "public/videos/" +
                  new Date().getTime() +
                  "-" +
                  request.files.video.name;

                // Read the file
                fileSystem.readFile(
                  request.files.video.path,
                  function (err, data) {
                    if (err) throw err;
                    console.log("File read!");

                    // Write the file
                    fileSystem.writeFile(video, data, function (err) {
                      if (err) throw err;
                      console.log("File written!");
                    });

                    // Delete the file
                    fileSystem.unlink(request.files.video.path, function (err) {
                      if (err) throw err;
                      console.log("File deleted!");
                    });
                  }
                );
              }

              database.collection("posts").insertOne(
                {
                  caption: caption,
                  image: image,
                  video: video,
                  type: type,
                  createdAt: createdAt,
                  likers: [],
                  comments: [],
                  shares: [],
                  user: {
                    _id: user._id,
                    name: user.name,
                    username: user.username,
                    profileImage: user.profileImage,
                  },
                },
                function (error, data) {
                  database.collection("users").updateOne(
                    {
                      accessToken: accessToken,
                    },
                    {
                      $push: {
                        posts: {
                          _id: data.insertedId,
                          caption: caption,
                          image: image,
                          video: video,
                          type: type,
                          createdAt: createdAt,
                          likers: [],
                          comments: [],
                          shares: [],
                        },
                      },
                    },
                    function (error, data) {
                      result.json({
                        status: "success",
                        message: "Post has been uploaded.",
                      });
                    }
                  );
                }
              );
            }
          }
        );
      });

      app.post("/getNewsfeed", function (request, result) {
        var accessToken = request.fields.accessToken;
        database.collection("users").findOne(
          {
            accessToken: accessToken,
          },
          function (error, user) {
            if (user == null) {
              result.json({
                status: "error",
                message: "User has been logged out. Please login again.",
              });
            } else {
              var ids = [];
              ids.push(user._id);

              database
                .collection("posts")
                .find({
                  "user._id": {
                    $in: ids,
                  },
                })
                .sort({
                  createdAt: -1,
                })
                .limit(5)
                .toArray(function (error, data) {
                  result.json({
                    status: "success",
                    message: "Record has been fetched",
                    data: data,
                  });
                });
            }
          }
        );
      });

      app.post("/toggleLikePost", function (request, result) {
        var accessToken = request.fields.accessToken;
        var _id = request.fields._id;

        database.collection("users").findOne(
          {
            accessToken: accessToken,
          },
          function (error, user) {
            if (user == null) {
              result.json({
                status: "error",
                message: "User has been logged out. Please login again.",
              });
            } else {
              database.collection("posts").findOne(
                {
                  _id: ObjectId(_id),
                },
                function (error, post) {
                  if (post == null) {
                    result.json({
                      status: "error",
                      message: "Post does not exist.",
                    });
                  } else {
                    var isLiked = false;
                    for (var a = 0; a < post.likers.length; a++) {
                      var liker = post.likers[a];

                      if (liker._id.toString() == user._id.toString()) {
                        isLiked = true;
                        break;
                      }
                    }

                    if (isLiked) {
                      database.collection("posts").updateOne(
                        {
                          _id: ObjectId(_id),
                        },
                        {
                          $pull: {
                            likers: {
                              _id: user._id,
                            },
                          },
                        },
                        function (error, data) {
                          database.collection("users").updateOne(
                            {
                              $and: [
                                {
                                  _id: post.user._id,
                                },
                                {
                                  "posts._id": post._id,
                                },
                              ],
                            },
                            {
                              $pull: {
                                "posts.$[].likers": {
                                  _id: user._id,
                                },
                              },
                            }
                          );

                          result.json({
                            status: "unliked",
                            message: "Post has been unliked.",
                          });
                        }
                      );
                    } else {
                      database.collection("users").updateOne(
                        {
                          _id: post.user._id,
                        },
                        {
                          $push: {
                            notifications: {
                              _id: ObjectId(),
                              type: "photo_liked",
                              content: user.name + " has liked your post.",
                              profileImage: user.profileImage,
                              isRead: false,
                              post: {
                                _id: post._id,
                              },
                              createdAt: new Date().getTime(),
                            },
                          },
                        }
                      );

                      database.collection("posts").updateOne(
                        {
                          _id: ObjectId(_id),
                        },
                        {
                          $push: {
                            likers: {
                              _id: user._id,
                              name: user.name,
                              profileImage: user.profileImage,
                            },
                          },
                        },
                        function (error, data) {
                          database.collection("users").updateOne(
                            {
                              $and: [
                                {
                                  _id: post.user._id,
                                },
                                {
                                  "posts._id": post._id,
                                },
                              ],
                            },
                            {
                              $push: {
                                "posts.$[].likers": {
                                  _id: user._id,
                                  name: user.name,
                                  profileImage: user.profileImage,
                                },
                              },
                            }
                          );

                          result.json({
                            status: "success",
                            message: "Post has been liked.",
                          });
                        }
                      );
                    }
                  }
                }
              );
            }
          }
        );
      });

      app.post("/postComment", function (request, result) {
        var accessToken = request.fields.accessToken;
        var _id = request.fields._id;
        var comment = request.fields.comment;
        var createdAt = new Date().getTime();

        database.collection("users").findOne(
          {
            accessToken: accessToken,
          },
          function (error, user) {
            if (user == null) {
              result.json({
                status: "error",
                message: "User has been logged out. Please login again.",
              });
            } else {
              database.collection("posts").findOne(
                {
                  _id: ObjectId(_id),
                },
                function (error, post) {
                  if (post == null) {
                    result.json({
                      status: "error",
                      message: "Post does not exist.",
                    });
                  } else {
                    var commentId = ObjectId();

                    database.collection("posts").updateOne(
                      {
                        _id: ObjectId(_id),
                      },
                      {
                        $push: {
                          comments: {
                            _id: commentId,
                            user: {
                              _id: user._id,
                              name: user.name,
                              profileImage: user.profileImage,
                            },
                            comment: comment,
                            createdAt: createdAt,
                            replies: [],
                          },
                        },
                      },
                      function (error, data) {
                        if (user._id.toString() != post.user._id.toString()) {
                          database.collection("users").updateOne(
                            {
                              _id: post.user._id,
                            },
                            {
                              $push: {
                                notifications: {
                                  _id: ObjectId(),
                                  type: "new_comment",
                                  content:
                                    user.name + " commented on your post.",
                                  profileImage: user.profileImage,
                                  post: {
                                    _id: post._id,
                                  },
                                  isRead: false,
                                  createdAt: new Date().getTime(),
                                },
                              },
                            }
                          );
                        }

                        database.collection("users").updateOne(
                          {
                            $and: [
                              {
                                _id: post.user._id,
                              },
                              {
                                "posts._id": post._id,
                              },
                            ],
                          },
                          {
                            $push: {
                              "posts.$[].comments": {
                                _id: commentId,
                                user: {
                                  _id: user._id,
                                  name: user.name,
                                  profileImage: user.profileImage,
                                },
                                comment: comment,
                                createdAt: createdAt,
                                replies: [],
                              },
                            },
                          }
                        );

                        database.collection("posts").findOne(
                          {
                            _id: ObjectId(_id),
                          },
                          function (error, updatePost) {
                            result.json({
                              status: "success",
                              message: "Comment has been posted.",
                              updatePost: updatePost,
                            });
                          }
                        );
                      }
                    );
                  }
                }
              );
            }
          }
        );
      });

      app.post("/postReply", function (request, result) {
        var accessToken = request.fields.accessToken;
        var postId = request.fields.postId;
        var commentId = request.fields.commentId;
        var reply = request.fields.reply;
        var createdAt = new Date().getTime();

        database.collection("users").findOne(
          {
            accessToken: accessToken,
          },
          function (error, user) {
            if (user == null) {
              result.json({
                status: "error",
                message: "User has been logged out. Please login again.",
              });
            } else {
              database.collection("posts").findOne(
                {
                  _id: ObjectId(postId),
                },
                function (error, post) {
                  if (post == null) {
                    result.json({
                      status: "error",
                      message: "Post does not exist.",
                    });
                  } else {
                    var replyId = ObjectId();

                    database.collection("posts").updateOne(
                      {
                        $and: [
                          {
                            _id: ObjectId(postId),
                          },
                          {
                            "comments._id": ObjectId(commentId),
                          },
                        ],
                      },
                      {
                        $push: {
                          "comments.$.replies": {
                            _id: replyId,
                            user: {
                              _id: user._id,
                              name: user.name,
                              profileImage: user.profileImage,
                            },
                            reply: reply,
                            createdAt: createdAt,
                          },
                        },
                      },
                      function (error, data) {
                        database.collection("users").updateOne(
                          {
                            $and: [
                              {
                                _id: post.user._id,
                              },
                              {
                                "posts._id": post._id,
                              },
                              {
                                "posts.comments._id": ObjectId(commentId),
                              },
                            ],
                          },
                          {
                            $push: {
                              "posts.$[].comments.$[].replies": {
                                _id: replyId,
                                user: {
                                  _id: user._id,
                                  name: user.name,
                                  profileImage: user.profileImage,
                                },
                                reply: reply,
                                createdAt: createdAt,
                              },
                            },
                          }
                        );

                        database.collection("posts").findOne(
                          {
                            _id: ObjectId(postId),
                          },
                          function (error, updatePost) {
                            result.json({
                              status: "success",
                              message: "Reply has been posted.",
                              updatePost: updatePost,
                            });
                          }
                        );
                      }
                    );
                  }
                }
              );
            }
          }
        );
      });

      app.post("/sharePost", function (request, result) {
        var accessToken = request.fields.accessToken;
        var _id = request.fields._id;
        var type = "shared";
        var createdAt = new Date().getTime();

        database.collection("users").findOne(
          {
            accessToken: accessToken,
          },
          function (error, user) {
            if (user == null) {
              result.json({
                status: "error",
                message: "User has been logged out. Please login again.",
              });
            } else {
              database.collection("posts").findOne(
                {
                  _id: ObjectId(_id),
                },
                function (error, post) {
                  if (post == null) {
                    result.json({
                      status: "error",
                      message: "Post does not exist.",
                    });
                  } else {
                    database.collection("posts").updateOne(
                      {
                        _id: ObjectId(_id),
                      },
                      {
                        $push: {
                          shares: {
                            _id: user._id,
                            name: user.name,
                            profileImage: user.profileImage,
                          },
                        },
                      },
                      function (error, data) {
                        database.collection("posts").insertOne(
                          {
                            caption: post.caption,
                            image: post.image,
                            video: post.video,
                            type: type,
                            createdAt: createdAt,
                            likers: [],
                            comments: [],
                            shares: [],
                            user: {
                              _id: user._id,
                              name: user.name,
                              gender: user.gender,
                              profileImage: user.profileImage,
                            },
                          },
                          function (error, data) {
                            database.collection("users").updateOne(
                              {
                                $and: [
                                  {
                                    _id: post.user._id,
                                  },
                                  {
                                    "posts._id": post._id,
                                  },
                                ],
                              },
                              {
                                $push: {
                                  "posts.$[].shares": {
                                    _id: user._id,
                                    name: user.name,
                                    profileImage: user.profileImage,
                                  },
                                },
                              }
                            );

                            result.json({
                              status: "success",
                              message: "Post has been shared.",
                            });
                          }
                        );
                      }
                    );
                  }
                }
              );
            }
          }
        );
      });

      app.get("/search/:query", function (request, result) {
        var query = request.params.query;
        result.render("search", {
          query: query,
        });
      });

      app.post("/search", function (request, result) {
        var query = request.fields.query;
        database
          .collection("users")
          .find({
            name: {
              $regex: ".*" + query + ".*",
              $options: "i",
            },
          })
          .toArray(function (error, data) {
            result.json({
              status: "success",
              message: "Record has been fetched",
              data: data,
            });
          });
      });

      app.get("/friends", function (request, result) {
        result.render("friends");
      });

      app.get("/inbox", function (request, result) {
        result.render("inbox");
      });

      app.get("/pages", function (request, result) {
        result.render("pages");
      });

      app.get("/groups", function (request, result) {
        result.render("groups");
      });

      app.get("/notifications", function (request, result) {
        result.render("notifications");
      });

      // ==================================================

      const formatMessage = require("./utils/messages");
      const {
        userJoin,
        getCurrentUser,
        userLeave,
        getRoomUsers,
      } = require("./utils/users");

      app.use(express.static(path.join(__dirname, "public")));

      // chat application

      // Set static folder

      const botName = "Pikadex Chat";

      // Run when client connects
      io.on("connection", (socket) => {
        console.log(io.of("/").adapter);
        socket.on("joinRoom", ({ username, room }) => {
          const user = userJoin(socket.id, username, room);

          socket.join(user.room);

          // Welcome current user
          socket.emit(
            "messages",
            formatMessage(botName, "Welcome to ChatCord!")
          );

          // Broadcast when a user connects
          socket.broadcast
            .to(user.room)
            .emit(
              "message",
              formatMessage(botName, `${user.username} has joined the chat`)
            );

          // Send users and room info
          io.to(user.room).emit("roomUsers", {
            room: user.room,
            users: getRoomUsers(user.room),
          });
        });

        // Listen for chatMessage
        socket.on("chatMessage", (msg) => {
          const user = getCurrentUser(socket.id);

          io.to(user.room).emit("message", formatMessage(user.username, msg));
        });

        // Runs when client disconnects
        socket.on("disconnect", () => {
          const user = userLeave(socket.id);

          if (user) {
            io.to(user.room).emit(
              "message",
              formatMessage(botName, `${user.username} has left the chat`)
            );

            // Send users and room info
            io.to(user.room).emit("roomUsers", {
              room: user.room,
              users: getRoomUsers(user.room),
            });
          }
        });
      });

      
      // Notes API: every note belongs to the authenticated user.

      function authenticateNotesRequest(request, response, callback) {
        const accessToken =
          (request.fields && request.fields.accessToken) ||
          (request.body && request.body.accessToken);

        if (typeof accessToken !== "string" || !accessToken) {
          return response.status(401).json({
            status: "error",
            message: "Authentication required."
          });
        }

        jwt.verify(accessToken, accessTokenSecret, function (tokenError) {
          if (tokenError) {
            return response.status(401).json({
              status: "error",
              message: "Invalid or expired token."
            });
          }

          database.collection("users").findOne(
            { accessToken: accessToken },
            function (databaseError, user) {
              if (databaseError) {
                console.error("Notes authentication error:", databaseError);
                return response.status(500).json({
                  status: "error",
                  message: "Unable to verify your session."
                });
              }

              if (!user) {
                return response.status(401).json({
                  status: "error",
                  message: "Please log in again."
                });
              }

              callback(user);
            }
          );
        });
      }

      // List only the logged-in user's notes.
      app.post("/api/notes/list", function (request, response) {
        authenticateNotesRequest(request, response, function (user) {
          database.collection("notes")
            .find({ userId: user._id })
            .sort({ updatedAt: -1 })
            .toArray(function (error, notes) {
              if (error) {
                console.error("Unable to load notes:", error);
                return response.status(500).json({
                  status: "error",
                  message: "Unable to load notes."
                });
              }

              response.json({
                status: "success",
                data: notes.map(function (note) {
                  return {
                    _id: note._id.toString(),
                    title: note.title,
                    content: note.content,
                    createdAt: note.createdAt,
                    updatedAt: note.updatedAt
                  };
                })
              });
            });
        });
      });

      // Create a note.
      app.post("/api/notes/create", function (request, response) {
        authenticateNotesRequest(request, response, function (user) {
          const title = request.fields && request.fields.title;
          const content = request.fields && request.fields.content;

          if (
            typeof title !== "string" ||
            !title.trim() ||
            title.trim().length > 100 ||
            typeof content !== "string" ||
            !content.trim() ||
            content.trim().length > 5000
          ) {
            return response.status(400).json({
              status: "error",
              message: "Title (max 100 characters) and content (max 5000 characters) are required."
            });
          }

          const now = new Date();
          const note = {
            userId: user._id,
            title: title.trim(),
            content: content.trim(),
            createdAt: now,
            updatedAt: now
          };

          database.collection("notes").insertOne(
            note,
            function (error, insertResult) {
              if (error) {
                console.error("Unable to create note:", error);
                return response.status(500).json({
                  status: "error",
                  message: "Unable to save note."
                });
              }

              response.status(201).json({
                status: "success",
                message: "Note saved.",
                noteId: insertResult.insertedId.toString()
              });
            }
          );
        });
      });

      // Update only a note owned by the logged-in user.
      app.post("/api/notes/update", function (request, response) {
        authenticateNotesRequest(request, response, function (user) {
          const fields = request.fields || {};
          const noteId = fields.noteId;
          const title = fields.title;
          const content = fields.content;

          if (
            typeof noteId !== "string" ||
            !ObjectId.isValid(noteId) ||
            typeof title !== "string" ||
            !title.trim() ||
            title.trim().length > 100 ||
            typeof content !== "string" ||
            !content.trim() ||
            content.trim().length > 5000
          ) {
            return response.status(400).json({
              status: "error",
              message: "Invalid note data."
            });
          }

          database.collection("notes").updateOne(
            {
              _id: new ObjectId(noteId),
              userId: user._id
            },
            {
              $set: {
                title: title.trim(),
                content: content.trim(),
                updatedAt: new Date()
              }
            },
            function (error, updateResult) {
              if (error) {
                console.error("Unable to update note:", error);
                return response.status(500).json({
                  status: "error",
                  message: "Unable to update note."
                });
              }

              const matched =
                updateResult.matchedCount ??
                (updateResult.result && updateResult.result.n) ??
                0;

              if (matched === 0) {
                return response.status(404).json({
                  status: "error",
                  message: "Note not found."
                });
              }

              response.json({
                status: "success",
                message: "Note updated."
              });
            }
          );
        });
      });

      // Delete only a note owned by the logged-in user.
      app.post("/api/notes/delete", function (request, response) {
        authenticateNotesRequest(request, response, function (user) {
          const noteId = request.fields && request.fields.noteId;

          if (
            typeof noteId !== "string" ||
            !ObjectId.isValid(noteId)
          ) {
            return response.status(400).json({
              status: "error",
              message: "Invalid note ID."
            });
          }

          database.collection("notes").deleteOne(
            {
              _id: new ObjectId(noteId),
              userId: user._id
            },
            function (error, deleteResult) {
              if (error) {
                console.error("Unable to delete note:", error);
                return response.status(500).json({
                  status: "error",
                  message: "Unable to delete note."
                });
              }

              const deleted =
                deleteResult.deletedCount ??
                (deleteResult.result && deleteResult.result.n) ??
                0;

              if (deleted === 0) {
                return response.status(404).json({
                  status: "error",
                  message: "Note not found."
                });
              }

              response.json({
                status: "success",
                message: "Note deleted."
              });
            }
          );
        });
      });

      
      // ================= TASK STORAGE API =================

      // Load only the logged-in user's projects and tasks.
      app.post("/api/tasks/load", function (request, response) {
        authenticateNotesRequest(request, response, async function (user) {
          try {
            const record = await database.collection("taskProjects").findOne({
              userId: user._id
            });

            return response.json({
              status: "success",
              data: record && Array.isArray(record.projects)
                ? record.projects
                : []
            });
          } catch (error) {
            console.error("Unable to load projects:", error);

            return response.status(500).json({
              status: "error",
              message: "Unable to load projects."
            });
          }
        });
      });


      // Save projects only under the logged-in user's ID.
      app.post("/api/tasks/save", function (request, response) {
        authenticateNotesRequest(request, response, async function (user) {
          try {
            const rawProjects =
              (request.fields && request.fields.projects) ||
              (request.body && request.body.projects);

            if (
              typeof rawProjects !== "string" ||
              rawProjects.length > 1000000
            ) {
              return response.status(400).json({
                status: "error",
                message: "Invalid or oversized project data."
              });
            }

            let projects;

            try {
              projects = JSON.parse(rawProjects);
            } catch (error) {
              return response.status(400).json({
                status: "error",
                message: "Project data must be valid JSON."
              });
            }

            if (!Array.isArray(projects) || projects.length > 100) {
              return response.status(400).json({
                status: "error",
                message: "Invalid project list."
              });
            }

            const safeProjects = [];
            let totalTasks = 0;

            function cleanText(value, maxLength) {
              if (typeof value !== "string") return null;

              const cleaned = value.trim().replace(/[<>]/g, "");

              return cleaned && cleaned.length <= maxLength
                ? cleaned
                : null;
            }

            for (const project of projects) {
              if (
                !project ||
                typeof project !== "object" ||
                !Number.isSafeInteger(Number(project.id)) ||
                Number(project.id) < 0 ||
                !Array.isArray(project.tasks) ||
                project.tasks.length > 1000
              ) {
                return response.status(400).json({
                  status: "error",
                  message: "Invalid project data."
                });
              }

              const projectName = cleanText(project.name, 100);

              if (!projectName) {
                return response.status(400).json({
                  status: "error",
                  message: "Every project needs a valid name."
                });
              }

              totalTasks += project.tasks.length;

              if (totalTasks > 2000) {
                return response.status(400).json({
                  status: "error",
                  message: "Too many tasks."
                });
              }

              const safeTasks = [];

              for (const task of project.tasks) {
                if (
                  !task ||
                  typeof task !== "object" ||
                  !Number.isSafeInteger(Number(task.id)) ||
                  Number(task.id) < 0 ||
                  !Array.isArray(task.logs) ||
                  task.logs.length > 5000
                ) {
                  return response.status(400).json({
                    status: "error",
                    message: "Invalid task data."
                  });
                }

                const taskName = cleanText(task.name, 200);

                if (
                  !taskName ||
                  !["Progress", "Completed"].includes(task.status)
                ) {
                  return response.status(400).json({
                    status: "error",
                    message: "Invalid task name or status."
                  });
                }

                const safeLogs = [];

                for (const log of task.logs) {
                  const logId = Number(log && log.id);
                  const startTime = Number(log && log.startTime);
                  const endTime = Number(log && log.endTime);

                  if (
                    !log ||
                    !Number.isSafeInteger(logId) ||
                    logId < 0 ||
                    !Number.isSafeInteger(startTime) ||
                    startTime <= 0 ||
                    !Number.isSafeInteger(endTime) ||
                    endTime < 0 ||
                    (endTime !== 0 && endTime < startTime)
                  ) {
                    return response.status(400).json({
                      status: "error",
                      message: "Invalid task timer log."
                    });
                  }

                  safeLogs.push({ id: logId, startTime, endTime });
                }

                safeTasks.push({
                  id: Number(task.id),
                  name: taskName,
                  status: task.status,
                  isStarted: task.isStarted === true,
                  logs: safeLogs,
                  started: typeof task.started === "string"
                    ? task.started.slice(0, 30)
                    : "",
                  ended: typeof task.ended === "string"
                    ? task.ended.slice(0, 30)
                    : ""
                });
              }

              safeProjects.push({
                id: Number(project.id),
                name: projectName,
                tasks: safeTasks
              });
            }

            await database.collection("taskProjects").updateOne(
              { userId: user._id },
              {
                $set: {
                  projects: safeProjects,
                  updatedAt: new Date()
                }
              },
              { upsert: true }
            );

            return response.json({
              status: "success",
              message: "Projects saved successfully."
            });
          } catch (error) {
            console.error("Unable to save projects:", error);

            return response.status(500).json({
              status: "error",
              message: "Unable to save projects."
            });
          }
        });
      });

      // ================ END TASK STORAGE API ================

      
      // To-Do routes - use the existing MongoDB connection
      const todoCollection = database.collection("todoItems");

      // Display To-Do items
      app.get("/todo", function (req, res) {
        todoCollection.find({}).toArray(function (error, items) {
          if (error) {
            console.error("Error fetching To-Do items:", error);
            return res.status(500).send("Unable to load To-Do items.");
          }

          res.render("list", { newListItems: items });
        });
      });

      // Add a To-Do item
      app.post("/", function (req, res) {
        const itemName = req.body && req.body.n;

        if (typeof itemName !== "string" || !itemName.trim()) {
          return res.status(400).send("Please enter a valid To-Do item.");
        }

        todoCollection.insertOne(
          {
            name: itemName.trim(),
            createdAt: new Date()
          },
          function (error) {
            if (error) {
              console.error("Error adding To-Do item:", error);
              return res.status(500).send("Unable to add To-Do item.");
            }

            res.redirect("/todo");
          }
        );
      });

      // Delete a To-Do item
      app.post("/delete", function (req, res) {
        const id = req.body && req.body.checkbox;

        if (typeof id !== "string" || !ObjectId.isValid(id)) {
          return res.status(400).send("Invalid To-Do item ID.");
        }

        todoCollection.deleteOne(
          { _id: new ObjectId(id) },
          function (error, result) {
            if (error) {
              console.error("Error deleting To-Do item:", error);
              return res.status(500).send("Unable to delete To-Do item.");
            }

            if (result.deletedCount === 0) {
              return res.status(404).send("To-Do item not found.");
            }

            res.redirect("/todo");
          }
        );
      });


      // ===================================================
      app.post("/markNotificationsAsRead", function (request, result) {
        var accessToken = request.fields.accessToken;

        database.collection("users").findOne(
          {
            accessToken: accessToken,
          },
          function (error, user) {
            if (user == null) {
              result.json({
                status: "error",
                message: "User has been logged out. Please login again.",
              });
            } else {
              database.collection("users").updateMany(
                {
                  $and: [
                    {
                      accessToken: accessToken,
                    },
                    {
                      "notifications.isRead": false,
                    },
                  ],
                },
                {
                  $set: {
                    "notifications.$.isRead": true,
                  },
                },
                function (error, data) {
                  result.json({
                    status: "success",
                    message: "Notifications has been marked as read.",
                  });
                }
              );
            }
          }
        );
      });

      app.get(
        "/verifyEmail/:email/:verification_token",
        function (request, result) {
          // Paid version only
          // Please read "How to install.txt" to get full version.
        }
      );

      app.get("/ResetPassword/:email/:reset_token", function (request, result) {
        // Paid version only
        // Please read "How to install.txt" to get full version.
      });

      app.get("/forgot-password", function (request, result) {
        // Paid version only
        // Please read "How to install.txt" to get full version.
        result.render("forgot-password");
      });

      app.post("/sendRecoveryLink", function (request, result) {
        // Paid version only
        // Please read "How to install.txt" to get full version.
      });

      app.post("/changePassword", function (request, result) {
        // Paid version only
        // Please read "How to install.txt" to get full version.
      });

      app.post("/sendMessage", function (request, result) {
        // Paid version only
        // Please read "How to install.txt" to get full version.
      });

      app.post("/connectSocket", function (request, result) {
        // Paid version only
        // Please read "How to install.txt" to get full version.
      });

      app.post("/toggleJoinGroup", function (request, result) {
        // Paid version only
        // Please read "How to install.txt" to get full version.
      });

      app.post("/sendFriendRequest", function (request, result) {
        // Paid version only
        // Please read "How to install.txt" to get full version.
      });

      app.post("/acceptFriendRequest", function (request, result) {
        // Paid version only
        // Please read "How to install.txt" to get full version.
      });
    }
  );
});

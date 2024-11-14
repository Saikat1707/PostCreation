const express=require("express")
const app=express()
const path=require("path")
const cookieParser=require("cookie-parser")
const bcrypt=require("bcrypt")
const jwt=require("jsonwebtoken")
const userModel=require("./models/user")
const postModel=require("./models/post")

app.set("view engine","ejs")
app.use(express.json())
app.use(express.urlencoded({extended:true}))
app.use(express.static(path.join(__dirname,"public")))
app.use(cookieParser())

app.get("/",function(req,res){
    res.render("index",{message:""})
})

app.post("/create",  function(req,res){
    let {name,username,email,age,password}=req.body
    let alreadyUser=userModel.findOne({email:email})
    if(alreadyUser){
       return res.render("index",{message:"You are already a user "})
    }else{
        bcrypt.genSalt(10, function(err, salt) {
            bcrypt.hash(password, salt,async function(err, hash) {
                  let createdUser=await userModel.create({
                    name,
                    username,
                    email,
                    age,
                    password:hash
                  })
    
                  let token =jwt.sign({email},"secret")
                  res.cookie("token",token)
                  res.redirect("/login")
            });
        });
    
    }
    
    
    
})

app.get("/login",function(req,res){
    res.render("login")
})

app.post("/login",async function(req,res){
        let user=await userModel.findOne({email:req.body.email})

        if(user){
            bcrypt.compare(req.body.password,user.password,function(err,result){
                if(result){
                    let token =jwt.sign({email:user.email},"secret")
                    res.cookie("token",token)
                    res.redirect("profile")
                }else{
                    res.status(500).send("something is wrong in password !!!!")
                }
                
            })
        }else{
            res.status(500).send("Something is wrong !!!")
        }
})

app.get("/profile",IsLoggedIn,function(req,res){
    jwt.verify(req.cookies.token,"secret",async function(err,result){
    let user = await userModel.findOne({email:result.email}).populate("posts")
    res.render("profile",{user})
    })
})

app.post("/post",function(req,res){
    jwt.verify(req.cookies.token,"secret",async function(err,result){
    let user = await userModel.findOne({email:result.email})
            let post =await postModel.create({
                content:req.body.content,
                user:user._id
            })
            user.posts.push(post._id)
            await user.save()
            
            res.redirect("/profile")
            
    })
    
    
})

app.get("/logout",function(req,res){
    res.cookie("token","")
    res.redirect("login")
})

app.get("/delete/:userEmail",async function(req,res){
    let user = await userModel.findOne({email:req.params.userEmail})
    let post=await postModel.findOne({use:user._id})
    let DeletedPost=await postModel.findOneAndDelete({user:user._id})
    if(post){
        user.posts.pull(post._id)
        await user.save()
    }
    
    res.redirect("/profile")
 
})

app.get("/AllPosts",IsLoggedIn,async function(req,res){
    let allPosts= await postModel.find().populate("user")
     res.render("posts",{allPosts});
})

function IsLoggedIn(req,res,next){
    const token=req.cookies.token
    if(token===""){
        res.send("You need to log in first")
    }else{
        jwt.verify(token, "secret", (err, decoded) => {
            if (err) {
                return res.status(401).send("Invalid or expired token");
            }
            req.user = decoded; 
            next();
        });
    }
}
app.listen(3000)
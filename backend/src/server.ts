import  express from "express";
import cors from "cors";
import helmet from "helmet";

const app = express();

const PORT = process.env.PORT || 5000 ;

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get("/health",(_req,res)=>{
    res.status(200).json({ 
      status: "OK" ,
      service: "DropSafe Backend",
    });
})

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});


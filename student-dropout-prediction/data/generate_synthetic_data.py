import pandas as pd
import numpy as np
import random
import os
import json
#timedelta is represents a duration or the difference between two dates or times
from datetime import datetime,timedelta


class SyntheticData:
    def __init__(self,num_students=500,seed=42):
        """
            Args:
            num_students: How many student records to generate
            seed: Random seed for reproducibility            
        """
        
        self.num_students = num_students
        np.random.seed(seed)
        random.seed(seed)
        
          
        print("=" * 60)
        print("  SYNTHETIC STUDENT DATA GENERATOR")
        print("  Student Dropout Prediction System")
        print(f"  Generating {num_students} student records...")
        print("=" * 60)
        
        #creating names
        self.male_first_names = [
             "Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun",
            "Sai", "Reyansh", "Ayaan", "Krishna", "Ishaan",
            "Shaurya", "Atharv", "Advik", "Pranav", "Advaith",
            "Dhruv", "Kabir", "Ritvik", "Aarush", "Kian",
            "Darsh", "Virat", "Rudra", "Rohan", "Rahul",
            "Vikram", "Suresh", "Karthik", "Manoj", "Deepak",
            "Rajesh", "Amit", "Nikhil", "Sachin", "Varun",
            "Akash", "Harsha", "Pavan", "Ganesh", "Mahesh",
            "Naveen", "Chetan", "Vishal", "Abhishek", "Sanjay",
            "Rakesh", "Ramesh", "Tarun", "Girish", "Mohan",
            "Vinay", "Prasad", "Venkat", "Ravi", "Sunil",
            "Anand", "Bharath", "Dinesh", "Hemanth", "Jagdish"
        ]
        
        self.female_first_names = [
            "Saanvi", "Aanya", "Aadhya", "Aaradhya", "Ananya",
            "Pari", "Anika", "Myra", "Sara", "Diya",
            "Advika", "Kiara", "Prisha", "Navya", "Aashi",
            "Ira", "Divya", "Sneha", "Pooja", "Priya",
            "Kavya", "Shruti", "Neha", "Meera", "Riya",
            "Swati", "Anjali", "Nandini", "Tanvi", "Ishita",
            "Archana", "Bhavana", "Chaitra", "Deepika", "Eshwari",
            "Fathima", "Gayathri", "Harini", "Indu", "Jyothi",
            "Keerthi", "Lakshmi", "Manasa", "Niveditha", "Pallavi",
            "Rashmi", "Sahana", "Tejaswini", "Uma", "Vidya"
        ]
        
        self.last_names = [
            "Sharma", "Patel", "Kumar", "Singh", "Reddy",
            "Rao", "Gupta", "Mishra", "Joshi", "Verma",
            "Nair", "Pillai", "Iyer", "Menon", "Hegde",
            "Gowda", "Shetty", "Kulkarni", "Patil", "Deshmukh",
            "Chauhan", "Pandey", "Dubey", "Yadav", "Agarwal",
            "Bansal", "Mehta", "Shah", "Das", "Bose",
            "Naik", "Kamath", "Bhat", "Deshpande", "Jain",
            "Saxena", "Tiwari", "Shukla", "Rastogi", "Malhotra"
        ]

        self.departments = {
            "CSE":   {"weight": 0.25, "prefix": "CS"},
            "ECE":   {"weight": 0.18, "prefix": "EC"},
            "ME":    {"weight": 0.15, "prefix": "ME"},
            "CE":    {"weight": 0.10, "prefix": "CV"},
            "EEE":   {"weight": 0.10, "prefix": "EE"},
            "ISE":   {"weight": 0.10, "prefix": "IS"},
            "AIML":  {"weight": 0.07, "prefix": "AI"},
            "AIDS":  {"weight": 0.05, "prefix": "AD"},
        }
        
        #behavioral data pending
        
    
    def generate(self):
        #Returns pandas records
        print("\n🔄 Generating student profiles...")
        students = []
        
        for i in range(self.num_students):
            student = self._generate_one_student(i)
            students.append(student)
            
            # Progress indicator
            if (i + 1) % 100 == 0:
                print(f"   ✅ Generated {i + 1}/{self.num_students} students")
        
        df = pd.DataFrame(students)
        
        # Print statistics
        self._print_statistics(df)
        
        return df
    
    def _generate_one_student(self, index):
        # generate one records
        gender = np.random.choice(
            ["Male", "Female"], 
            p=[0.62, 0.38]  # Typical engineering college ratio
        )
        
        if gender == "Male":
            first_name = random.choice(self.male_first_names)
        else:
            first_name = random.choice(self.female_first_names)
        
        last_name = random.choice(self.last_names)
        name = f"{first_name} {last_name}"
        
         # Semester distribution (more students in early semesters)
        semester = np.random.choice(
            [1, 2, 3, 4, 5, 6, 7, 8],
            p=[0.18, 0.16, 0.14, 0.13, 0.12, 0.10, 0.09, 0.08]
        )
        
        # Age based on semester
        base_age = 17 + (semester // 2)
        age = base_age + np.random.choice([0, 0, 0, 1, 1, 2])
        age = int(np.clip(age, 17, 25))
        
        # Department
        dept_names = list(self.departments.keys())
        dept_weights = [self.departments[d]["weight"] for d in dept_names]
        department = np.random.choice(dept_names, p=dept_weights)
        dept_prefix = self.departments[department]["prefix"]
        
        # Student ID
        admission_year = 2024 - (semester // 2)
        student_id = f"{dept_prefix}{admission_year}{str(index + 1).zfill(3)}"
        
        # Phone Number (Indian format)
        phone_prefix = random.choice(["7", "8", "9"])
        phone = f"+91{phone_prefix}{np.random.randint(100000000, 999999999)}"
        
        # Email
        email = f"{first_name.lower()}.{last_name.lower()}{random.randint(1,99)}@gmail.com"
        
        # 2 -- Acedmic data
         # Current score - correlates with 12th marks + noise
        # Merit students tend to perform better
        
        admission_type = np.random.choice(
            ["Merit", "Management", "Lateral Entry"],
            p=[0.50, 0.35, 0.15]
        )
        
        admission_bonus = {
            "Merit": 5, "Management": -3, "Lateral Entry": -5
        }
        
        income_bonus = {
            "Low": -5, "Medium": 0, "High": 3
        }
        
        family_income = np.random.choice(
            ["Low", "Medium", "High"],
            p=[0.30, 0.50, 0.20]
        )
    
        current_score = np.clip(
            np.random.randint(50,99) * 0.5
            + np.random.normal(25, 12)
            + admission_bonus.get(admission_type, 0)
            + income_bonus.get(family_income, 0),
            15, 98
        )
        
        total_credits = semester * 25  # ~25 credits per semester
        credits_earned = int(
            total_credits * (current_score / 100)
            * np.random.uniform(0.85, 1.05)
        )
        credits_earned = min(credits_earned, total_credits)
        
        # matadata
          # Last active date (for tracking)
        days_ago = np.random.randint(0, 30)
        last_active = (
            datetime.now() - timedelta(days=days_ago)
        ).strftime("%Y-%m-%d")
        
        # Registration date
        reg_date = (
            datetime(admission_year, 7, 1) 
            + timedelta(days=np.random.randint(0, 60))
        ).strftime("%Y-%m-%d")
        
        return {
            # ── Mandatory Fields ──
            "student_id": student_id,
            "name": name,
            "email": email,
            "phone": phone,
            "age": int(age),
            "gender": gender,
            "current_score": round(float(current_score), 2),
            # "attendance": round(float(attendance), 2), attendance not taken
            "semester": int(semester),
            
            # ── Academic Details ──
            "department": department,
            "admission_type": admission_type,
            "credits_earned": int(credits_earned),
            "total_credits": int(total_credits),
            
            # ── Personal Details ──
            "family_income": family_income,
            
            # # ── Behavioral Data (Chatbot Simulated) ──
            # "avg_sentiment": round(avg_sentiment, 4),
            # "stress_count": int(stress_count),
            # "stress_keywords": ", ".join(mentioned_keywords) if mentioned_keywords else "",
            # "message_frequency": round(float(message_frequency), 2),
            # "engagement_score": round(float(engagement_score), 4),
            # "dropout_signal": dropout_signal,
                    
            # ── Metadata ──
            "registration_date": reg_date,
            "last_active_date": last_active,
            "mentor_assigned": False,
            "mentor_id": None,
        }
        
    def _print_statistics(self, df):
        """Print detailed statistics of generated data"""
        
        print("\n" + "=" * 60)
        print(" GENERATED DATA STATISTICS")
        print("=" * 60)
        
        total = len(df)
        
        print(f"\n  Total Students     : {total}")
        
        print(f"\n  ── Gender Distribution ──")
        for gender in df['gender'].unique():
            count = len(df[df['gender'] == gender])
            print(f"  {gender:12s}: {count:4d} ({count/total*100:.1f}%)")
        
        print(f"\n  ── Department Distribution ──")
        for dept in sorted(df['department'].unique()):
            count = len(df[df['department'] == dept])
            dropout_in_dept = len(
                df[(df['department'] == dept)]
            )
            print(
                f"  {dept:8s}: {count:4d} students, "
                f"{dropout_in_dept:3d} dropouts "
                f"({dropout_in_dept/count*100:.1f}%)"
            )
        
        
        print(f"\n  ── Academic Score Stats ──")
        print(f"  Current Score: Mean={df['current_score'].mean():.1f}, "
              f"Min={df['current_score'].min():.1f}, "
              f"Max={df['current_score'].max():.1f}")

    def save_csv(self, df, filename="synthetic_students.csv"):
        """Save as CSV"""
        
        output_dir = os.path.dirname(os.path.abspath(__file__))
        filepath = os.path.join(output_dir, filename)
        df.to_csv(filepath, index=False)
        print(f"\n  ✅ CSV saved: {filepath}")
        print(f"     Rows: {len(df)}, Columns: {len(df.columns)}")
        return filepath
    
if __name__ == "__main__":
        # ── Configuration ──
        NUM_STUDENTS = 500      # Change this as needed
        RANDOM_SEED = 42        # For reproducibility
    
        # ── Generate Data ──
        generator = SyntheticData(
            num_students=NUM_STUDENTS,
            seed=RANDOM_SEED
        )
        
        # Generate main dataset
        df = generator.generate()
        
        # ── Save in Multiple Formats ──
        print("\n" + "=" * 60)
        print("  💾 SAVING DATA FILES")
        print("=" * 60)  

        generator.save_csv(df, "synthetic_students.csv")

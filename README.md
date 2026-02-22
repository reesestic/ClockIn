# ClockIn Study Hub

## Local Dev Instructions 

### Installation
To install and develop ClockIn locally, there are 3 main steps.
1. Clone the Repo
2. Install dependencies
3. Run development server

## First Step: Clone the Repo
Navigate to the root of where you would like your file created and git clone the URL of this repo. After cloning the repo locally, you will have the backend and frontend files needed for development, along with the needed requirements file.
To set up the frontend after cloning, run 

`npm install`

This installs the node_modules that are not uploaded to Github that are required for functionality.
To set up the backend, there are two main steps. First, create the virtual environment. Run the following commands in your terminal from *inside the backend folder*.

`python -m venv venv`

`source venv/bin/activate`  # Mac/Linux

### OR
`venv\Scripts\activate`     # Windows
### Note: If the venv activation did not work, try this command instead.
`venv\Scripts\Activate.ps1`

After this command, your venv should be activated and you are ready for stpe two.
Next, install the dependencies inside your virtual environment for development compatibility.
`pip install -r requirements.txt`
`uvicorn main:app --reload`
This creates a file of local requirements for your virtual environment.

For your .env file, copy our .env.example and fill in your own API keys.

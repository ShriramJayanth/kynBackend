#official docker image for nodejs runtime
FROM node:20-alpine3.20

#set working dir
WORKDIR /app

#copy package.json and package-lock.json to the container
COPY package*.json .

#install dependencies
RUN npm install

# Copy the rest of the code
COPY . .

#expose port that the app runs
EXPOSE 3003

#Define the command to run your app
CMD ["node","./index.js"]
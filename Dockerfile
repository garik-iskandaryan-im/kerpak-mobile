FROM node:14.15.4

# Create app directory
WORKDIR /usr/src/app
# Install app dependencies
COPY package.json ./
COPY package-lock.json ./

CMD rm -rf node_modules
CMD ls -l

RUN npm ci --silent
# Copy app source code
COPY . .

#Expose port and start application
EXPOSE 4000

## Launch the wait tool and then your application
# RUN npm prune --production
# CMD npm start
CMD ["npm","start"]

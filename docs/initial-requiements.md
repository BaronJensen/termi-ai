Lets start a new project, call cursovable, this project should be able to send commands to the terminal wait for  
 resposes and then continue working, the user should be able to prompt the command into a ui, the we have to be  
 able to select a folder to start and optionally a api key to add to the starter commant into the console, the way
we prompt the instruccions should be on a chat format to the right and in the other side we should be able to see a react vite project running just like in the image

Every time we select a folder we will run a terminal command to run the vite project we have to wait to recive the url and port where the app is running and then display the page content into the virtual browser (iframe).

The commants we need to use every time is cursor-agent -p --output-format="json" <user message>

We have to wait the terminal until it gets: {"type":"result","subtype":"success","is_error":false,"duration_ms":47348,"duration_api_ms":47348,"result":"I'll scan the snake.html to locate where the game-over condition is handled so I can hook in a losing sound, and search for common identifiers like \"game over\", \"lose\", or collision handling.I’m going to add a playLoseSound() Web Audio function and call it when the game ends inside endGame(). Then I’ll save the changes.- I scanned snake.html to find the game-over handler.\n- I added a Web Audio losing sound generator and call it when the game ends.\n\nYou can now hear a short descending “lose” tone when you crash. Note: browsers may require a user interaction before playing audio; any click/key press will unlock it automatically.\n\n- Changes made:\n - Added playLoseSound() using Web Audio API.\n - Invoked it inside endGame() after setting isGameOver and showing the overlay.\n- Files updated: snake.html","session_id":"e743e958-2945-4e5b-b0e6-70155fe469bf"}

Once we got the response lets save the json in a history array, an display result as a .md message

To summarize, we could start new sessions adding a react vite folder path, when loading that path it should run yarn dev and wait for the port and then preview the app, the user should be able to send messages in a chat, all the users messages should trigger a terminal cursor-agent -p --output-format="json" <user message> (dont display all the command to the user), then after sending the message lets wait for the response, and when we go the response lets print it into the db, the idea for this app is to be an electron app, we a runnable "hidden" server to run the terminal commands im thinking that we could use, i attached a sh with a similar project so you can get inspired

let username = document.querySelector("#username");
let email = document.querySelector("#email");
let registerPassword = document.querySelector("#registerPassword");

let identifier = document.querySelector("#identifier");
let loginPassword = document.querySelector("#password");

let userId = null;

let register = async () => {
  let { data } = await axios.post("http://localhost:1337/api/auth/local/register", {
    username: username.value,
    email: email.value,
    password: registerPassword.value,
  });
  userId = data.user.id;
  alert("User has been created! Please login :) ");
};

let login = async () => {
    let { data } = await axios.post("http://localhost:1337/api/auth/local", {
      identifier: identifier.value,
      password: loginPassword.value,
    });
    sessionStorage.setItem("token", data.jwt);
    await renderProfileCard(); // Call renderProfileCard() after successful login
    renderPage();
  };
  
  let renderProfileCard = async () => {
    if (!sessionStorage.getItem("token")) {
      let message = document.createElement("p");
      message.textContent = "Please log in to view your profile.";
      document.querySelector("#profile-container").innerHTML = "";
      document.querySelector("#profile-container").appendChild(message);
      return;
    }
  
    let userResponse = await axios.get("http://localhost:1337/api/users/me?populate=deep,3", {
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem("token")}`,
      },
    });
    let { data: user } = userResponse;
    userId = user.id;
  
    let favoritesResponse = await axios.get("http://localhost:1337/api/favorite-books?populate=deep,2", {
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem("token")}`,
      },
    });
    let favorites = favoritesResponse.data;
  
    let favoriteBooks = "";
    if (favorites && favorites.length > 0) {
      favoriteBooks = favorites.map((favorite) => `<li>${favorite.book.title}</li>`).join("");
    } else {
      favoriteBooks = "<li>du har inga böcker att läsa.</li>";
    }
  
    let profileContainer = document.querySelector("#profile-container");
    if (profileContainer.dataset.userId !== user.id || profileContainer.dataset.favoriteBooks !== favoriteBooks) {
      profileContainer.innerHTML = `
        <h2>${user.username}'s Profile</h2>
        <h3>Att läsa:</h3>
        <ul>
          ${favoriteBooks}
        </ul>
      `;
      profileContainer.dataset.userId = user.id;
      profileContainer.dataset.favoriteBooks = favoriteBooks;
    }
  };
  
  
  
  let addFavoriteBook = async (event, userId) => {
    event.preventDefault();
    if (!sessionStorage.getItem("token")) {
      alert("Please log in to add favorite books.");
      return;
    }
    let bookId = event.target.dataset.bookId;
    try {
      await axios.post(
        `http://localhost:1337/api/users/${userId}/favorite-books`,
        {
          book: bookId,
        },
        {
          headers: {
            Authorization: `Bearer ${sessionStorage.getItem("token")}`,
          },
        }
      );
      await renderProfileCard(); // update the profile card after adding the favorite book
    } catch (error) {
      console.error(error);
    }
  };
  
  


  
  document.querySelectorAll(".favorite-form").forEach((form) => form.addEventListener("submit", (event) => addFavoriteBook(event, userId)));
  document.querySelector("#login").addEventListener("click", login);
  document.querySelector("#profile-container").addEventListener("click", renderProfileCard);
  
  
  
  let books = []; // Declare books globally

  let submitRating = async (event, bookId, currentRating) => {
    event.preventDefault();
    let newRating = parseInt(document.querySelector(`#rating-input-${bookId}`).value);
    if (newRating === currentRating) {
      alert("Please select a new rating.");
      return;
    }
    try {
      let response = await axios.post(
        `http://localhost:1337/api/ratings`,
        {
          attributes: {
            book: bookId,
            rating: newRating,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${sessionStorage.getItem("token")}`,
          },
        }
      );
      let updatedRating = response.data.data;
      let ratingsResponse = await axios.get(`http://localhost:1337/api/ratings?book=${bookId}`);
      let ratings = ratingsResponse.data.data;
      let ratingValues = ratings.map((rating) => rating.attributes.rating);
      ratingValues.sort((a, b) => a - b); // Sort the ratings in ascending order
      let medianIndex = Math.floor(ratingValues.length / 2); // Select the middle value as the median
      let medianRating = ratingValues[medianIndex];
      let bookIndex = books.findIndex((book) => book.id === bookId);
      books[bookIndex].rating = medianRating; // Update the book rating in the global books array
      let bookContainer = document.querySelector(`#book-${bookId}`);
      let ratingContainer = bookContainer.querySelector(".book-rating");
      let ratingCountContainer = bookContainer.querySelector(".book-rating-count");
      ratingContainer.textContent = `${medianRating.toFixed(1)}`;
      ratingCountContainer.textContent = `(${ratingValues.length})`;
    } catch (error) {
      console.error(error);
    }
  };
  

  let renderPage = async () => {
    // Fetch all books
    let booksResponse = await axios.get("http://localhost:1337/api/books?populate=author&populate=ratings");

    let books = booksResponse.data.data;
  
    // Fetch all ratings
    let ratingsResponse = await axios.get("http://localhost:1337/api/ratings?populate=deep,2");
    let ratings = ratingsResponse.data.data;
  
    // Add rating information to books array
    books = books.map((book) => {
      let bookRatings = ratings.filter((rating) => rating.attributes.book === book.id);
      let ratingSum = bookRatings.reduce((sum, rating) => sum + rating.attributes.rating, 0);
      let averageRating = ratingSum / bookRatings.length;
      return {
        ...book,
        rating: averageRating || 0,
      };
    });
  
    // Render the book list
    let bookList = document.createElement("ul");
    books.forEach((book) => {
      bookList.innerHTML += `
        <li>
          <h3>${book.attributes.title}</h3>
          <h4>${book.attributes.author}</h4>
          <img src="http://localhost:1337${book.cover?.url}"/>
          <p>${book.attributes.info}</p>
          <p>${book.attributes.page} page</p>
          <p>Rating: ${book.rating}/5</p>
          ${
            sessionStorage.getItem("token")
              ? `
              <form onsubmit="submitRating(event, ${book.id}, ${book.rating})">
                  <label for="rating-input-${book.id}">Rate this book:</label>
                  <input type="number" id="rating-input-${book.id}" name="rating-input" min="1" max="5" required>
                  <button type="submit">Submit</button>
                </form>
              `
              : ""
          }
          <button onclick="addFavorite(${book.id}, '${book.attributes.title}')">Add to Favorites</button>

        </li>
      `;
    });
    document.querySelector("#book-container").innerHTML = "";
    document.querySelector("#book-container").appendChild(bookList);


  
    // Add event listener to "Att läsa" buttons
    let favoriteButtons = document.querySelectorAll("button");
    favoriteButtons.forEach((button) => {
      if (button.textContent === "Att läsa") {
        button.addEventListener("click", (event) => {
          event.preventDefault();
          addFavorite(button.getAttribute("data-id"));
        });
      }
    });
  }; 

  
  let addFavorite = async (id, title) => {
    console.log(`Adding book ${id} to favorites`);
    // Get the logged-in user's ID
    let userResponse = await axios.get("http://localhost:1337/api/users/me", {
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem("token")}`,
      },
    });
    let user = userResponse.data;
  
    // Check if the book is already in the user's favorites
    let existingFavoritesResponse = await axios.get(
      `http://localhost:1337/api/favorite-books?username=${user.id}&title=${title}`,
     
      {
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem("token")}`,
        },
      }
    );
    let existingFavorites = existingFavoritesResponse.data.data;
    
    // If the book is already in the user's favorites, do nothing
    if (existingFavorites.length > 0) {
      alert("This book is already in your favorites!");
      return;
    }
  
    // Add the book to the user's favorites
    try {
      await axios.post(
        "http://localhost:1337/api/favorite-books",
        {
          username: user.id,
          title: title,
        },
        {
          headers: {
            Authorization: `Bearer ${sessionStorage.getItem("token")}`,
          },
        }
      );
  
      // Retrieve the updated list of favorites
      let favoritesResponse = await axios.get(
        `http://localhost:1337/api/favorite-books?username=${user.id}`,
        {
          headers: {
            Authorization: `Bearer ${sessionStorage.getItem("token")}`,
          },
        }
      );
      let favorites = favoritesResponse.data.data;
      console.log("Updated list of favorites:", favorites);

      // Update the profile card with the updated list of favorites
  
      let profileCard = document.getElementById("profile-container");
      let favoriteList = profileCard.querySelector(".favorite-list");
      favoriteList.innerHTML = "";
      for (let favorite of favorites) {
        let listItem = document.createElement("li");
        listItem.textContent = favorite.title;
        favoriteList.appendChild(listItem);
      }
  
      alert("Book added to favorites!");
    } catch (error) {
      console.error(error);
      
    }
  };
  
  
  
    let logout = async () => {
      sessionStorage.clear();
      identifier.value = "";
    
      document.querySelector("#profile-container").innerHTML = "";
      renderPage();
    };
  
  document.querySelector("#register").addEventListener("click", register);
  document.querySelector("#login").addEventListener("click", login);
  
  renderPage();
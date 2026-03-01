const USERS_KEY = "users";
const AUTH_KEY = "authUser";

function getUsers(){
    return JSON.parse(localStorage.getItem(USERS_KEY)) || [];
}
function saveUsers(users){
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function registerUser(email, password){
    const users = getUsers();

    const exists = users.some(user => user.email === email);
    if(exists){
        return {success: false, message: "Email already registered"};
    }

    users.push({email, password});
    saveUsers(users);
    return {success: true};
}

function loginUser(email, password){
    const users = getUsers();

    const user = users.find(
        u => u.email === email && u.password === password
    );

    if(!user){
        return{success: false, message: "Invalid Email or Password"};
    }

    localStorage.setItem(
        AUTH_KEY,
        JSON.stringify({
            email: user.email,
            isLoggedIn:true,
            loginTime: new Date().toISOString()
        })
    );
    return{success: true};
}
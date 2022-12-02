# Getting Started

Welcome to the Travel Log sample API, intended as a base to develop a simple mobile application for educational purposes.

Its domain model is quite simple:

* Users can register with a username and password.
* Trips can be created by users.
* Places traveled to can be created within trips.
  * Places have a geographical location and optional picture.



## Authentication

Some of this API's resources are protected and require authentication.

The authentication workflow is as follows:

* Register a user account with `POST /api/users` if you don't already have one.
  See [Register a new user account](#api-Users-CreateUser) for instructions.
* "Log in", i.e. request an authentication token, by providing your username and password to `POST /api/auth`.
  You will obtain a bearer token in exchange.
  See [Request an authentication token](#api-Authentication-CreateAuthenticationToken) for instructions.
* When sending requests to a protected resource, send an `Authorization` header with your bearer token:

  ```http
  POST https://comem-travel-log-api.onrender.com/api/trips HTTP/1.1
  Content-Type: application/json
  Authorization: Bearer eyJhbGciOiJIUzI1N.eyJzdWIiOiIxMjM0NTY3ODkw.SflKxwRJSMeKKF

  { ... }
  ```

### Authorization

Some of this API's resources require special authorization to access, even for authenticated users:

* A user account can only be modified or deleted by the user itself.
* Trips can only be modified or deleted by the user who created them.
* Places can only be modified or deleted by the user who created them.



## Pagination

All list/search resources are paginated, meaning that if there are many elements in the collection, the API response will only contain one page of them at a time.

When making a **request** to a paginated collection, you can specify the `page` and `pageSize` query parameters to customize which page and how many elements you want to list:

```http
GET https://comem-travel-log-api.onrender.com/api/trips?page=2&pageSize=50 HTTP/1.1
```

The **response** from the server will list the selected elements, along with metadata about the pagination in the form of:

* A [`Link` header][link] indicating links to the following relations: `self` (current page), `first` (first page), `last` (last page).
  Depending on the current page, it might also include the following additional relations: `prev` (previous page), `next` (next page).

  In a JavaScript client-side application, you may parse this header with the [parse-link-header package][parse-link-header].
* A `Pagination-Page` header indicating the current page number.
* A `Pagination-Page-Size` header indicating the current page size.
* A `Pagination-Total` header indicating the total number of elements in the collection, regardless of filters.
* A `Pagination-Filtered-Total` header indicating the total number of elements in the collection that match the applied filters.
  (This will be the same as `Pagination-Total` if there are no filters.)

```http
HTTP/1.1 200 OK
Content-Type: application/json
Link: <https://comem-travel-log-api.onrender.com/api/trips?pageSize=50&page=2>; rel="self last",
      <https://comem-travel-log-api.onrender.com/api/trips?pageSize=50&page=1>; rel="first prev"
Pagination-Page: 2
Pagination-PageSize: 50
Pagination-Total: 52
Pagination-Filtered-Total 52

[
  { ... },
  { ... }
]
```

If there are **filters** applied through query parameters, they are applied before pagination, meaning that only matching elements will be listed.
In the case, the value of the `Pagination-Filtered-Total` header might differ from that of the `Pagination-Total` header, indicating that some elements were filtered out.



## Filtering & sorting

All list/search resources can be filtered and sorted through URL query parameters to list only the relevant elements:

* [List or search user accounts](#api-Users-RetrieveAllUsers)
* [List or search trips](#api-Trips-RetrieveAllTrips)
* [List or search places](#api-Places-RetrieveAllPlaces)



## Deletion

All `DELETE` requests are permanent and deletions are cascaded to linked resources:

* Deleting a trip will delete all of its places.
* Deleting a user will delete all of its trips and all of their places.



[link]: https://www.w3.org/wiki/LinkHeader
[parse-link-header]: https://www.npmjs.com/package/parse-link-header

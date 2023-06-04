const axios = require('axios');
const cheerio = require('cheerio');
const express = require('express');
const request = require('request')

const app = express();

const PORT = process.env.PORT || 5000;

// TOP RATED MOVIES
app.get('/movies/topRated', async (req, res) => {

    try {
        const response = await axios.get('https://www.imdb.com/chart/top');
        const $ = cheerio.load(response.data)
        const movieTitles = [];

        $('.lister-list tr').each((index, element) => {
            const title = $(element).find('.titleColumn a').text().trim();
            const rating = $(element).find('.ratingColumn strong').text().trim();
            const year = $(element).find('.titleColumn span').text().trim();
            const poster = $(element).find('.posterColumn img').attr('src');
            const movieId = $(element).find('.posterColumn a').attr('href').split('/')[2];
            const movies = {
                "movie": {
                    title,
                    movieDetails: {
                        rating,
                        year,
                        poster,
                        movieId
                    }
                }
            }

            movieTitles.push(movies)
        });

        res.json(movieTitles);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred' });
    }
});

// MOVIE DETAILS
app.get('/movie/:filmId', async (req, res) => {
    try {
        const { filmId } = req.params
        let movie = [{ id: `${filmId}`, title: '', released: '', filmGenres: {}, filmCap: '', rating: '', poster: '', casting: {}, related: {} }];
        const html = await new Promise((resolve, reject) => {
            request(`https://www.imdb.com/title/${filmId}/`, function (
                error,
                response,
                html
            ) {
                if (error) reject(error);
                else resolve(html);
            });
        });

        const $ = cheerio.load(html);
        // movie title
        $(".sc-52d569c6-0.kNzJA-D").filter(function () {
            const data = $(this);
            movie[0].title = data.children().first().text();
        });
        // released year
        $(".sc-52d569c6-0.kNzJA-D ul").filter(function () {
            const data = $(this);
            movie[0].released = data.find('li a').first().text();
        });
        // genres
        const genres = []
        $('.ipc-chip-list__scroller a').each((index, element) => {
            const genre = $(element).find('span').text().trim();
            genres.push(genre)
        })
        movie[0].filmGenres = genres

        // film cap
        $(".sc-385ac629-10.SacCW section").filter(function () {
            const data = $(this);
            movie[0].filmCap = data.find('p span').first().text();
        });

        // film rating
        $(".sc-bde20123-2.gYgHoj").filter(function () {
            const data = $(this);
            movie[0].rating = data.find('span').first().text();
        });

        // poster
        $(".sc-30a29d44-0.dktfIa .ipc-media__img").filter(function () {
            const data = $(this);
            movie[0].poster = data.find('.ipc-image').attr('src');
        });

        // casting
        const castings = []
        $('.ipc-shoveler .ipc-sub-grid .sc-bfec09a1-5.kUzsHJ').each((index, element) => {
            const actor = { name: '', img: '', character: '' }
            const name = $(element).find('.sc-bfec09a1-7.dpBDvu .sc-bfec09a1-1.fUguci').text().trim();
            const castingPic = $(element).find('.sc-bfec09a1-6.cRAGvN .ipc-avatar .ipc-media img').attr('src');
            const character = $(element).find('.sc-bfec09a1-7.dpBDvu .title-cast-item__characters-list ul li a').text().trim();
            actor.name = name
            actor.img = castingPic
            actor.character = character
            castings.push(actor)
        })
        movie[0].casting = castings

        // related movies
        const related = []
        $('.ipc-sub-grid .ipc-poster-card').each((index, element) => {
            const movie = { id: '', title: '', poster: '', rating: '', }
            const regex = /\/title\/([a-zA-Z0-9]+)/;

            const title = $(element).find('a span').text().trim();
            const rating = $(element).find('.ipc-rating-star-group span').text().trim();
            const poster = $(element).find('.ipc-poster .ipc-media img').attr('src');
            const movieId = $(element).find('.ipc-poster a').attr('href');
            const matchId = movieId.match(regex);

            if (matchId && matchId[1]) {
                const movieId = matchId[1];
                movie.id = movieId
            }
            movie.poster = poster
            movie.rating = rating
            movie.title = title
            related.push(movie)
        })
        movie[0].related = related


        res.json(movie);
    } catch (error) {
        console.log('An error occurred:', error);
        res.status(500).json({ error: 'An error occurred' });
    }
});

// SEARCH MOVIES
app.get('/search/:searchQuery', async (req, res) => {
    try {
        const { searchQuery } = req.params
        let movie = [];
        const html = await new Promise((resolve, reject) => {
            request(`https://www.imdb.com/find/?q=${searchQuery}`, function (
                error,
                response,
                html
            ) {
                if (error) reject(error);
                else resolve(html);
            });
        });

        const $ = cheerio.load(html);
        // movies search list
        $('.sc-17bafbdb-2.ffAEHI .ipc-metadata-list li').each((index, element) => {
            const movieObj = { id: '', title: '', released: '', casting: [], poster: '' }
            const regex = /\/title\/([a-zA-Z0-9]+)/;

            const poster = $(element).find('.sc-daafffbc-0.eBTIIV .ipc-media img').attr('src');
            const title = $(element).find('.ipc-metadata-list-summary-item__tc a').text().trim();
            const released = $(element).find('.ipc-metadata-list-summary-item__tc .ipc-metadata-list-summary-item__tl li').text().trim();
            const casting = $(element).find('.ipc-metadata-list-summary-item__tc .ipc-metadata-list-summary-item__stl li').text().trim();

            const movieId = $(element).find('.ipc-metadata-list-summary-item__tc a').attr('href');
            if(movieId != undefined){
                const matchId = movieId.match(regex);
                if (matchId && matchId[1]) {
                    const movieId = matchId[1];
                    movieObj.id = movieId
                }
            }

            const castArray = casting.split(", ")

            movieObj.casting = castArray
            movieObj.released = released
            movieObj.title = title
            movieObj.poster = poster
            if (title !== '') {
                movie.push(movieObj)
            }
        })



        res.json(movie);
    } catch (error) {
        console.log('An error occurred:', error);
        res.status(500).json({ error: 'An error occurred' });
    }
});

// GENRES
app.get('/movies/genres', async (req, res) => {
    try {
        let genres = [];
        const html = await new Promise((resolve, reject) => {
            request(`https://www.imdb.com/feature/genre/`, function (
                error,
                response,
                html
            ) {
                if (error) reject(error);
                else resolve(html);
            });
        });

        const $ = cheerio.load(html);
        // genres list
        $('.sc-7e857967-1.bgxwho .ipc-chip-list__scroller:eq(1) .ipc-chip--on-base-accent2').each((index, element) => {
            const genre = $(element).find('.ipc-chip__text').text().trim();
            
            genres.push(genre)
        })



        res.json(genres);
    } catch (error) {
        console.log('An error occurred:', error);
        res.status(500).json({ error: 'An error occurred' });
    }
});

// SEARCH BY GENRE
app.get('/movies/genres/:genre', async (req, res) => {
    try {
        const { genre } = req.params
        let genresMovieList = [];
        const html = await new Promise((resolve, reject) => {
            request(`https://www.imdb.com/search/title/?genres=${genre}`, function (
                error,
                response,
                html
            ) {
                if (error) reject(error);
                else resolve(html);
            });
        });

        const $ = cheerio.load(html);
        // genres list
        $('.lister .lister-list .lister-item.mode-advanced').each((index, element) => {
            const movie = {id: '', title: '', rating: '', poster: '', released: '', runtime: '', genres: [], filmCap: '', director: '', casting: []}

            const title = $(element).find('.lister-item-content h3 a').text().trim();
            const rating = $(element).find('.lister-item-content .ratings-bar .inline-block strong').text().trim();
            const released = $(element).find('.lister-item-content h3 .lister-item-year').text().trim();
            const runtime = $(element).find('.lister-item-content .text-muted .runtime').text().trim();
            const genre = $(element).find('.lister-item-content .text-muted .genre').text().trim();
            const genreArray = genre.split(', ')
            const cap = $(element).find('.lister-item-content p:eq(1)').text().trim();
            const director = $(element).find('.lister-item-content p:eq(2) a:eq(0)').text().trim();
            const casting = $(element).find('.lister-item-content p:eq(2) a:gt(0)').text().trim();
            const castingArray = casting.split(' ')
            // find the problem with the poster in search by genre
            const poster = $(element).find(`.lister-item-image.float-left img[alt="${title}"]`).attr('src')
            const moviId = $(element).find(`.lister-item-image.float-left a img`).attr('data-tconst')
            
            movie.id = moviId
            movie.poster = poster
            movie.casting = castingArray
            movie.director = director
            movie.filmCap = cap
            movie.genres = genreArray
            movie.runtime = runtime
            movie.released = released
            movie.rating = rating
            movie.title = title
            genresMovieList.push(movie)
        })



        res.json(genresMovieList);
    } catch (error) {
        console.log('An error occurred:', error);
        res.status(500).json({ error: 'An error occurred' });
    }
});

// MOST WATCHED
app.get('/movies/most-watched', async (req, res) => {
    try {
        let mostWatched = [];
        const html = await new Promise((resolve, reject) => {
            request(`https://www.imdb.com/chart/boxoffice/`, function (
                error,
                response,
                html
            ) {
                if (error) reject(error);
                else resolve(html);
            });
        });

        const $ = cheerio.load(html);
        const date = $('.article.listo h4').text().trim();
        mostWatched.push(date)

        $('.article.listo .chart.full-width tbody tr').each((index, element) => {
            const movieMostWatched = {id: '', title: '', poster: '', generated: ''}
            const regex = /\/title\/([a-zA-Z0-9]+)/;

            const title = $(element).find('.titleColumn a').text().trim()
            const allGenerated = $(element).find('.ratingColumn:eq(1) span').text().trim()
            const poster = $(element).find('.posterColumn a img').attr('src')

            const movieId = $(element).find('.posterColumn a').attr('href');
            if(movieId != undefined){
                const matchId = movieId.match(regex);
                if (matchId && matchId[1]) {
                    const movieId = matchId[1];
                    movieMostWatched.id = movieId
                }
            }

            movieMostWatched.poster = poster
            movieMostWatched.generated = allGenerated
            movieMostWatched.title = title
            mostWatched.push(movieMostWatched)
        })

        res.json(mostWatched);
    } catch (error) {
        console.log('An error occurred:', error);
        res.status(500).json({ error: 'An error occurred' });
    }
});

//----------------------------   TV SHOWS   -----------------------------------------------

// POPULAR TV SOWS


app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
// to start server
const express = require('express');
const app = express();

// to use http mehods like (put, patch, delete)
const methodOverride = require('method-override')

// get the path to run from any dir
const path = require('path');

const ejsMate = require('ejs-mate');

// joi schema to validate campgrounds
const { reviewSchema, campgroundSchema } = require('./Schemas.js');

const catchAsync = require('./utils/catchAsync');
const ExpressError = require('./utils/ExpressError');

// to use mongodb
const mongoose = require('mongoose');

// to start connection with mongodb
mongoose.connect('mongodb://localhost:27017/yelp-camp', { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true })
    .then(() => {
        console.log("MONGO CONNECTION OPEN!!!")
    })
    .catch(err => {
        console.log("OH NO MONGO CONNECTION ERROR!!!!")
        console.log(err)
    })

// Views folder and EJS setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// to parse form data in POST request body
app.use(express.urlencoded({ extended: true }));

// To 'fake' put/patch/delete requests
app.use(methodOverride('_method'))

// to access product db in models folder
const Campground = require('./models/campground');
const Review = require('./models/review');

app.engine('ejs', ejsMate);

const validateCampground = (req, res, next) => {
    const { error } = campgroundSchema.validate(req.body);
    if (error) {
        const msg = error.details.map(e => e.message).join(',');
        throw new ExpressError(msg, 400);
    }
    next();
}

const validateReview = (req, res, next) => {
    const { error } = reviewSchema.validate(req.body);
    if (error) {
        const msg = error.details.map(e => e.message).join(',');
        throw new ExpressError(msg, 400);
    }
    next();
}


app.get('/campgrounds', catchAsync(async (req, res) => {
    const campgrounds = await Campground.find({});
    res.render('campgrounds/index', { campgrounds });
}))

app.get('/campgrounds/new', (req, res) => {
    res.render('campgrounds/new');
})

app.post('/campgrounds', validateCampground, catchAsync(async (req, res) => {
    const campground = new Campground(req.body.campground);
    await campground.save();
    res.redirect(`/campgrounds/${campground._id}`);
}))

app.get('/campgrounds/:id/edit', catchAsync(async (req, res) => {
    const campground = await Campground.findById(req.params.id);
    res.render('campgrounds/edit', { campground });
}))

app.put('/campgrounds/:id', validateCampground, catchAsync(async (req, res) => {
    await Campground.findByIdAndUpdate(req.params.id, req.body.campground);
    res.redirect(`/campgrounds/${req.params.id}`);
}))

app.get('/campgrounds/:id', catchAsync(async (req, res) => {
    const campground = await Campground.findById(req.params.id).populate('reviews');
    res.render('campgrounds/show', { campground });
}))

app.delete('/campgrounds/:id', catchAsync(async (req, res) => {
    await Campground.findByIdAndDelete(req.params.id);
    res.redirect('/campgrounds');
}))

app.post('/campgrounds/:id/reviews', validateReview, catchAsync(async (req, res) => {
    const campground = await Campground.findById(req.params.id);
    const review = new Review(req.body.review);
    campground.reviews.push(review);
    await review.save();
    await campground.save();
    res.redirect(`/campgrounds/${req.params.id}`);
}))

app.delete('/campgrounds/:id/reviews/:reviewId', catchAsync(async (req, res) => {
    const campground = await Campground.findByIdAndUpdate(req.params.id, { $pull: { reviews: req.params.reviewId } });
    const review = await Review.findByIdAndDelete(req.params.reviewId);
    res.redirect(`/campgrounds/${req.params.id}`);
}))

app.all('*', (req, res, next) => {
    next(new ExpressError('Page Not Found', 404));
})

app.use((err, req, res, next) => {
    const { statusCode = 400, message = 'something went wrong' } = err;
    res.status(statusCode).render('error', { err });
})


app.listen(3000, () => {
    console.log('ON PORT 3000')
})
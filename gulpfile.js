const fs = require('fs');
const path = require('path');
const gulp = require('gulp');
const sass = require('gulp-sass');
const autoprefixer = require('gulp-autoprefixer');
const concat = require('gulp-concat');
const sourcemaps = require('gulp-sourcemaps');
const cleanCSS = require('gulp-clean-css');
const rev = require('gulp-rev');
const imagemin = require('gulp-imagemin');
const tmodjs = require('gulp-tmod');
const replace = require('gulp-replace');
const babel = require('gulp-babel');
const eslint = require('gulp-eslint');
const uglify = require('gulp-uglify');
const revCollector = require('gulp-rev-collector');
const htmlmin = require('gulp-htmlmin');
const clean = require('gulp-clean');
const requirejsRevReplace = require('gulp-requirejs-rev-replace');
const connect = require('gulp-connect');
const open = require('gulp-open');
const modRewrite = require('connect-modrewrite');

gulp.task('style:dev', function() {
    return gulp.src('src/style/**/*.scss')
        .pipe(sourcemaps.init())
        .pipe(sass().on('error', sass.logError))
        .pipe(autoprefixer({
            browsers: ['last 2 versions'],
            cascade: false
        }))

    .pipe(concat('main.css'))
        .pipe(replace('@charset "UTF-8";', '')) //修改的
        .pipe(sourcemaps.write())
        .pipe(gulp.dest('./src/style/'))

})

// gulp.task('template', function(done) {
//     let basePath = path.join(__dirname, 'src/template');
//     let files = fs.readdirSync(basePath);
//     gulp.src('src/template/' + val + '/**/*.html')
//         .pipe(tmodjs({
//             templateBase: 'src/template/' + val,
//             runtime: val + '.js',
//             compress: false
//         }))
//         .pipe(replace('var String = this.String;', 'var String = window.String;'))
//         .pipe(gulp.dest('src/js/template/'));
//     done();
// })
// 创建一个任务：把模板生成js文件(相当于将模板预编译)
gulp.task('template', function() {
    return gulp
        .src('src/template/**/*.html')
        .pipe(
            tmodjs({
                templateBase: 'src/template/',
                runtime: 'tpl.js',
                compress: false
            }))
        // 自动生成的模板文件，进行babel转换，会报错，此转换插件已经停更，所以间接改这个bug
        // 参考bug：https://github.com/aui/tmodjs/issues/112 主要是this  →  window
        .pipe(replace('var String = this.String;', 'var String = window.String;'))

    .pipe(gulp.dest('src/js/template'));
});

gulp.task('style', function() {
    return gulp.src('src/style/**/*.scss')
        .pipe(sass().on('error', sass.logError))
        .pipe(autoprefixer({
            browsers: ['last 2 versions'],
            cascade: false
        }))

    .pipe(concat('main.css'))
        .pipe(cleanCSS({ compatibility: 'ie8', specialComments: 'all' }))
        .pipe(rev())
        .pipe(gulp.dest('./dist/style'))
        .pipe(rev.manifest())
        .pipe(gulp.dest('./src/style'))
})

gulp.task('imagemin', function() {
    return gulp.src('src/assets/image/**/*.*')
        .pipe(imagemin({
            optimizationLevel: 5,
            progressive: true,
            interlaced: true,
            multipass: true
        }))
        .pipe(gulp.dest('./dist/assets/image'))
})

gulp.task('js', function() {
    return gulp.src(['src/**/*.js', '!src/lib/**/*.js'])
        .pipe(eslint())
        .pipe(eslint.format())
        .pipe(eslint.failAfterError())
        .pipe(babel())
        .pipe(uglify())
        .pipe(rev())
        .pipe(gulp.dest('./dist'))
        .pipe(rev.manifest())
        .pipe(gulp.dest('src/js'))
})

gulp.task('requireConfigReplace', function() {
    return gulp.src('./dist/main/**/*.js')
        .pipe(requirejsRevReplace({
            manifest: gulp.src('src/js/rev-manifest.json')
        }))
        .pipe(gulp.dest('./dist/main'))
})

gulp.task('html', function() {
    return gulp.src(['src/**/*.json', 'src/**/*.html'])
        .pipe(revCollector({ replaceReved: true }))
        .pipe(htmlmin({
            removeComments: true, // 清除HTML注释
            collapseWhitespace: true, // 压缩HTML
            // collapseBooleanAttributes: true, //省略布尔属性的值 <input checked="true"/> ==> <input />
            removeEmptyAttributes: true, // 删除所有空格作属性值 <input id="" /> ==> <input />
            removeScriptTypeAttributes: true, // 删除<script>的type="text/javascript"
            removeStyleLinkTypeAttributes: true, // 删除<style>和<link>的type="text/css"
            minifyJS: true, // 压缩页面JS
            minifyCSS: true // 压缩页面CSS
        }))
        .pipe(gulp.dest('./dist/'))
})

gulp.task('copyassets', function() {
    return gulp.src(['src/assets/font/**/*.*', 'src/lib/**/*.*'], { read: true, base: './src' })
        .pipe(gulp.dest('dist/'));
})

gulp.task('clean', function() {
    return gulp.src(['./dist/style/**', './dist/js/**', './dist/main/**'], { read: false })
        .pipe(clean({ force: true }))
})

gulp.task('dist', gulp.series('clean', 'copyassets', 'template', 'style', 'imagemin', 'js', 'html', 'requireConfigReplace'));

gulp.task('devServer', function(done) {
    connect.server({
        root: ['./src'],
        port: 30000,
        livereload: true,
        middleware: function(connect, opt) {
            return [
                modRewrite([
                    '^/api/(.*)$ http://localhost:30000/$1'
                ])
            ]
        }
    })
    done();
})

gulp.task('open', gulp.series('devServer', function() {
    return gulp.src(__filename)
        .pipe(open({
            uri: 'http://localhost:30000/login.html'
        }))
}))

gulp.task('dev', gulp.series('open', function() {
    gulp.watch('src/style/**/*.scss').on('change', gulp.series('style:dev'));

    gulp.watch('src/template/**/*.html').on('change', gulp.series('template'));
}))